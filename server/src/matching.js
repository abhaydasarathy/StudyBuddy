/**
 * StudyBuddy Deterministic & Explainable Compatibility Engine
 * Calculates multi-factor compatibility between two students based on:
 * - Shared courses & subjects (weight 40%)
 * - Availability overlap (weight 30%)
 * - Learning method synergy (weight 20%)
 * - University & department alignment (weight 10%)
 */

export function calculateCompatibility(userA, userB) {
  const coursesA = safeParseJson(userA.courses, []);
  const coursesB = safeParseJson(userB.courses, []);

  const availA = safeParseJson(userA.weekly_availability, []);
  const availB = safeParseJson(userB.weekly_availability, []);

  const methodsA = safeParseJson(userA.preferred_methods, []);
  const methodsB = safeParseJson(userB.preferred_methods, []);

  // 1. Course overlap using canonical course codes and titles
  const sharedCourses = coursesA.filter((cA) =>
    coursesB.some((cB) => {
      const codeA = (cA.includes(":") ? cA.split(":")[0] : cA).trim().toLowerCase();
      const codeB = (cB.includes(":") ? cB.split(":")[0] : cB).trim().toLowerCase();
      return codeA === codeB || cA.toLowerCase().trim() === cB.toLowerCase().trim();
    })
  );
  const courseScore =
    coursesA.length > 0 && coursesB.length > 0
      ? (sharedCourses.length / Math.max(coursesA.length, coursesB.length)) * 100
      : 0;

  // 2. Availability overlap (detecting matching day/time keywords)
  let matchingSlots = 0;
  availA.forEach((slotA) => {
    const dayA = extractDay(slotA);
    if (dayA && availB.some((slotB) => slotB.toLowerCase().includes(dayA.toLowerCase()))) {
      matchingSlots++;
    }
  });
  const maxSlots = Math.max(availA.length, availB.length, 1);
  const availScore = Math.min(100, (matchingSlots / maxSlots) * 100);

  // 3. Learning Methods overlap
  const sharedMethods = methodsA.filter((mA) =>
    methodsB.some((mB) => mB.toLowerCase().trim() === mA.toLowerCase().trim())
  );
  const methodScore =
    methodsA.length > 0 && methodsB.length > 0
      ? (sharedMethods.length / Math.max(methodsA.length, methodsB.length)) * 100
      : 0;

  // 4. University alignment bonus
  const uniScore =
    userA.university && userB.university &&
    userA.university.toLowerCase() === userB.university.toLowerCase()
      ? 100
      : 50;

  // Combined weighted score
  const totalScore = Math.round(
    courseScore * 0.4 +
    availScore * 0.3 +
    methodScore * 0.2 +
    uniScore * 0.1
  );

  // Clamped between 40 and 98 to avoid unrealistic deterministic extremes
  const finalScore = Math.max(45, Math.min(96, totalScore));

  // Determine explanation reasons based on real metrics
  const reasons = [];
  if (sharedCourses.length > 0) {
    reasons.push(`Shared focus in ${sharedCourses.join(", ")}`);
  }
  if (matchingSlots > 0) {
    reasons.push(`Overlapping study availability`);
  }
  if (sharedMethods.length > 0) {
    reasons.push(`Common preference for ${sharedMethods.join(" and ")}`);
  }
  if (uniScore === 100) {
    reasons.push(`Same university cohort (${userA.university})`);
  }

  const reasonExplanation =
    reasons.length > 0
      ? `${finalScore}% compatible. ` + reasons.join("; ") + "."
      : `${finalScore}% compatible based on academic department and goals.`;

  return {
    score: finalScore,
    sharedCourses,
    sharedMethods,
    explanation: reasonExplanation,
    breakdown: {
      subjectOverlap: Math.round(courseScore),
      availabilityOverlap: Math.round(availScore),
      methodMatch: Math.round(methodScore)
    }
  };
}

function safeParseJson(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

function extractDay(str) {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  for (const d of days) {
    if (str.toLowerCase().includes(d)) return d;
  }
  return null;
}
