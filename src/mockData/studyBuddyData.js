/**
 * StudyBuddy Seed Data & Mock Dataset
 * Faithful to Stitch screens: "Academic Modern Workspace"
 */

export const CURRENT_USER = {
  id: "user-me",
  name: "Alex Rivera",
  email: "alex.rivera@stanford.edu",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
  university: "Stanford University",
  department: "Computer Science",
  degree: "B.S. Computer Science",
  year: "3rd Year",
  studyGoal: "Preparing for CS145 Database Systems Midterm & Algorithms Practice",
  methods: ["Pair Programming", "Flashcards", "Practice Exams"],
  weeklyHours: 12,
  availability: ["Wed 6:00 PM - 9:00 PM", "Thu 4:00 PM - 7:00 PM", "Sat 10:00 AM - 2:00 PM"],
  integrations: {
    googleAccount: { connected: true, email: "alex.rivera@stanford.edu", lastSync: "Just now" },
    calendar: { connected: true, syncedEvents: 4 },
    drive: { connected: true, sharedFolders: 2 },
    chat: { connected: true, activeSpaces: 3 },
    meet: { connected: true, activeConference: false },
    gmail: { connected: false }
  }
};

export const CANDIDATES = [
  {
    id: "student-1",
    name: "Elena Rostova",
    university: "Stanford University",
    department: "Computer Science",
    year: "3rd Year",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    compatibilityScore: 94,
    compatibilityTier: "HIGH",
    verifiedStudent: true,
    bio: "Passionate about distributed DBs & query optimization. Looking for a committed study partner to drill LeetCode SQL & B-Tree indexing.",
    courses: ["CS145: Database Systems", "CS161: Algorithms", "STATS116"],
    goals: "Master B+ Trees, ACID isolation levels, and score 90%+ on CS145 Midterm",
    methods: ["Whiteboarding", "Practice Problems", "Deep Concept Explanations"],
    complementaryStrengths: "Strong in Query Execution & SQL tuning; seeking partner for Normalization & Concurrency",
    availabilityMatch: "Wednesday 6:30 PM - 9:00 PM & Saturday Morning",
    googleIntegration: { docsReady: true, meetAvailable: true, calendarOverlap: "85%" },
    recommendationReason: "94% compatible. You are both prepping for the CS145 exam, have overlapping Wednesday evening availability, and prefer problem-solving over passive reading."
  },
  {
    id: "student-2",
    name: "Marcus Vance",
    university: "UC Berkeley",
    department: "Electrical Eng & Computer Science",
    year: "Junior",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    compatibilityScore: 88,
    compatibilityTier: "STRONG",
    verifiedStudent: true,
    bio: "EECS major building high-throughput systems. Seeking regular focus sessions with shared Google Meet accountability.",
    courses: ["CS145: Databases", "CS162: Operating Systems"],
    goals: "Crush distributed consensus (Raft/Paxos) and relational schema design",
    methods: ["Pomodoro 50/10", "Mock Interviews", "Flashcard Quizzing"],
    complementaryStrengths: "Excellent system internals knowledge; looking for study cadence accountability",
    availabilityMatch: "Thursday 4:00 PM - 7:00 PM",
    googleIntegration: { docsReady: true, meetAvailable: true, calendarOverlap: "70%" },
    recommendationReason: "88% compatible. Overlapping study target on Database Systems and identical preferred sprint structure (Pomodoro 50/10)."
  },
  {
    id: "student-3",
    name: "Aisha Patel",
    university: "Stanford University",
    department: "Data Science & AI",
    year: "Master's 1st Year",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    compatibilityScore: 91,
    compatibilityTier: "HIGH",
    verifiedStudent: true,
    bio: "Math & CS background. I love breaking down complex graph algorithms and query cost estimators.",
    courses: ["CS145: Database Systems", "CS229: Machine Learning"],
    goals: "Co-author thorough summary notes on Drive and test each other weekly",
    methods: ["Shared Google Docs", "Flashcards", "Concept Teaching"],
    complementaryStrengths: "Superb mathematical intuition; looking for practical implementation buddy",
    availabilityMatch: "Wednesday Evening & Saturday 11:00 AM",
    googleIntegration: { docsReady: true, meetAvailable: true, calendarOverlap: "90%" },
    recommendationReason: "91% compatible. High synergy across CS145 and active Google Drive note collaboration habits."
  }
];

export const MUTUAL_MATCHES = [
  {
    id: "match-101",
    student: {
      id: "student-1",
      name: "Elena Rostova",
      university: "Stanford University",
      department: "Computer Science",
      year: "3rd Year",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
      matchedDate: "Yesterday at 4:15 PM"
    },
    compatibilityScore: 94,
    compatibilityTier: "HIGH",
    sharedCourse: "CS145: Database Systems",
    synergyMetrics: {
      subjectOverlap: 98,
      availabilityOverlap: 92,
      learningMethodMatch: 95,
      skillComplementarity: 90
    },
    chatSpace: {
      name: "Elena & Alex — CS145 Sprint",
      link: "https://chat.google.com/room/AAAASampleChat145",
      status: "Active Space"
    },
    nextSession: {
      title: "CS145: B-Tree Indexing Deep Dive",
      time: "Tomorrow, 6:30 PM - 8:00 PM",
      meetUrl: "https://meet.google.com/xyz-stud-bdy"
    }
  },
  {
    id: "match-102",
    student: {
      id: "student-3",
      name: "Aisha Patel",
      university: "Stanford University",
      department: "Data Science & AI",
      year: "Master's 1st Year",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
      matchedDate: "2 days ago"
    },
    compatibilityScore: 91,
    compatibilityTier: "HIGH",
    sharedCourse: "CS145: Database Systems",
    synergyMetrics: {
      subjectOverlap: 94,
      availabilityOverlap: 90,
      learningMethodMatch: 90,
      skillComplementarity: 92
    },
    chatSpace: {
      name: "Aisha & Alex — Query Optimization",
      link: "https://chat.google.com/room/AAAASampleChatAisha",
      status: "Active Space"
    },
    nextSession: null
  }
];

export const STUDY_GROUPS = [
  {
    id: "group-1",
    name: "CS145 Midterm Masters",
    subject: "Computer Science 145",
    description: "Intense collaborative sprint covering relational algebra, B+ Trees, concurrency transactions, and storage layouts.",
    membersCount: 4,
    maxMembers: 5,
    members: [
      { name: "Alex Rivera (You)", avatar: CURRENT_USER.avatar, role: "Lead" },
      { name: "Elena Rostova", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80", role: "Member" },
      { name: "Marcus Vance", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80", role: "Member" },
      { name: "Aisha Patel", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80", role: "Member" }
    ],
    googleWorkspace: {
      chatSpaceUrl: "https://chat.google.com/room/CS145MidtermSquad",
      driveFolderUrl: "https://drive.google.com/drive/folders/SampleDriveFolderCS145",
      sharedDocs: [
        { title: "CS145 Consolidated Study Guide.gdoc", type: "Doc", url: "https://docs.google.com/document/d/sample1" },
        { title: "Query Optimization Cheatsheet.gsheet", type: "Sheet", url: "https://docs.google.com/spreadsheets/d/sample2" }
      ]
    },
    activePoll: {
      id: "poll-201",
      title: "Confirm Midterm Weekend Mock Exam Slot",
      deadline: "Closes in 6 hours",
      totalVotes: 3,
      options: [
        { id: "opt-1", time: "Saturday 10:00 AM - 12:30 PM", votes: 3, isRecommended: true, voters: ["Alex", "Elena", "Aisha"] },
        { id: "opt-2", time: "Saturday 2:00 PM - 4:30 PM", votes: 2, isRecommended: false, voters: ["Elena", "Marcus"] },
        { id: "opt-3", time: "Sunday 4:00 PM - 6:30 PM", votes: 1, isRecommended: false, voters: ["Marcus"] }
      ]
    }
  }
];

export const UPCOMING_SESSIONS = [
  {
    id: "sess-1",
    title: "CS145: B-Tree Indexing Deep Dive",
    groupOrMatch: "Elena Rostova (Study Partner)",
    time: "Tomorrow, 6:30 PM - 8:00 PM",
    calendarSync: "Synced with Google Calendar",
    calendarId: "cal_evt_9381029",
    meetUrl: "https://meet.google.com/xyz-stud-bdy",
    agenda: ["B-Tree vs Hash indexing tradeoffs", "Range scans & pointer traversal", "Practice quiz on disk block reads"],
    driveNotesUrl: "https://docs.google.com/document/d/sample1",
    status: "CONFIRMED"
  },
  {
    id: "sess-2",
    title: "CS145 Midterm Masters: Mock Exam Session",
    groupOrMatch: "CS145 Midterm Masters (Squad)",
    time: "Saturday, 10:00 AM - 12:30 PM",
    calendarSync: "Synced with Google Calendar",
    calendarId: "cal_evt_5928103",
    meetUrl: "https://meet.google.com/squad-cs145-meet",
    agenda: ["Timed practice exam (75 mins)", "Peer review of answers", "AI Assistant review of error patterns"],
    driveNotesUrl: "https://drive.google.com/drive/folders/SampleDriveFolderCS145",
    status: "SCHEDULED"
  }
];
