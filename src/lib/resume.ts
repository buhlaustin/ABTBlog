/** Career history from https://github.com/buhlaustin/.github/blob/main/profile/README.md */

export type ResumeRole = {
  title: string;
  organization: string;
  organizationUrl?: string;
  period: string;
  location?: string;
  highlights: string[];
};

export type ResumeGroup = {
  name: string;
  roles: ResumeRole[];
};

export const classQuipIntro = {
  headline:
    "Building the action-first virtual classroom for K–12—where teachers get frictionless tools, students stay engaged, and districts can roll out safely at scale.",
  platformBullets: [
    "Live participation analytics—see who's engaged and who needs a nudge in real time",
    "Quip polls & tools—polls, word clouds, and exit tickets without leaving the room",
    "Instant breakout groups—spin up rooms with one click and bring everyone back seamlessly",
    "Moderated live chat with teacher-controlled safety",
    "FERPA-aware design with role-based controls for schools and districts",
    "Deep LTI 1.3 integration with Canvas, Blackboard, Schoology, and Clever",
  ],
  architectNote:
    "As Chief Architect, I design and ship the platform end to end—from real-time classroom infrastructure to teacher workflows that have to work on a Tuesday morning with 28 seventh graders.",
} as const;

export const focusAreas = [
  {
    area: "Product",
    detail:
      "Teacher-first workflows, zero-friction engagement tools, district-ready safety",
  },
  {
    area: "Architecture",
    detail:
      "Real-time systems, scalable classroom infrastructure, LMS integrations",
  },
  {
    area: "Education",
    detail:
      "K–12 live, hybrid, and remote instruction that keeps students participating",
  },
  {
    area: "AI",
    detail:
      "Practical classroom intelligence—engagement signals and teacher assistance, not gimmicks",
  },
] as const;

export const resumeGroups: ResumeGroup[] = [
  {
    name: "Executive & founder leadership",
    roles: [
      {
        title: "Co-Founder, CEO & Chief Architect",
        organization: "ClassQuip",
        organizationUrl: "https://classquip.com",
        period: "Sep 2026 – Present",
        location: "Remote",
        highlights: [
          "Lead company direction, product vision, and technical architecture for an enterprise virtual classroom platform built for K–12 districts—business operations and full-stack engineering for real-time instruction, LMS integration, and automated compliance tools.",
          "Architect core infrastructure: low-latency WebRTC video, zero-cookie LTI 1.3 Advantage auth, and network fallbacks for low-bandwidth environments; systems that automate attendance and session logs for district audits.",
          "Drive go-to-market and institutional growth through the AltaIR Capital AltaLab Fall 2026 cohort and district pilot programs; partner with the Chief Academic Officer to align the platform with real teaching workflows.",
        ],
      },
      {
        title: "Founder, CEO & Chief Architect",
        organization: "Salestrics",
        organizationUrl: "https://github.com/Salestrics",
        period: "Jun 2026 – Sep 2026",
        location: "Maryville, TN",
        highlights: [
          "Built an AI-native revenue operating platform solo—multi-party WebRTC video grids, real-time financial ledger sync, and in-app collaborative document editing for complex B2B workflows.",
          "Configured multi-tenant cloud infrastructure, automated DNS routing, and custom mail-server setups for secure multi-domain communications at scale.",
          "Ran early customer discovery and operations before winding down the entity to focus on new market opportunities.",
        ],
      },
    ],
  },
  {
    name: "Enterprise edtech operations (Stride, Inc.)",
    roles: [
      {
        title: "Support Services Supervisor",
        organization: "Stride, Inc.",
        period: "Jun 2024 – Jul 2026",
        location: "Remote",
        highlights: [
          "Supervised K–12 technical and operational support across multi-district virtual schools in Salesforce Service Cloud—Clever, ClassLink, PowerSchool, Canvas, Brightspace, Engageli, Newrow, and more.",
          "Used Salesforce dashboards, reporting, and SLA tracking to optimize queues, escalations, and resolution times; documented LMS integration friction for cross-functional improvements.",
          "Partnered with districts, school leaders, and engineering to maintain knowledge bases and high-reliability online learning at scale.",
        ],
      },
      {
        title: "Support Services Technician Level 2",
        organization: "Stride, Inc.",
        period: "Jun 2021 – May 2024",
        location: "Remote",
        highlights: [
          "Delivered Tier 2 support for large-scale virtual programs—Canvas, Brightspace, Newrow, Engageli, PowerSchool, Clever, ClassLink—and complex Salesforce escalations.",
          "Collaborated with district admins and engineering on platform bugs, documentation, and knowledge-base resources.",
          "Won the 2023 CCTS Hackathon with an AI-powered virtual customer care prototype recognized for innovation in automated support and operational efficiency.",
        ],
      },
      {
        title: "Stand Up Supervisor, Enrollment Operations",
        organization: "Stride, Inc.",
        period: "Jun 2020 – Jun 2021",
        location: "Alcoa, TN",
        highlights: [
          "Led 10–20 enrollment specialists through high-volume onboarding for public school families across multiple district partnerships.",
          "Tracked conversion and productivity with CRM reporting; restructured peak-season workflows to maximize throughput.",
          "Partnered with compliance and leadership on process improvements across the K–12 enrollment pipeline.",
        ],
      },
      {
        title: "Enrollment Consultant",
        organization: "Stride, Inc.",
        period: "Apr 2019 – Jul 2020",
        location: "Alcoa, TN",
        highlights: [
          "Guided families through state compliance and applications in enterprise CRM; personally processed enrollment for 1,600+ K–12 students.",
          "Founded the Career Prep Flip Team to streamline career-track onboarding—supporting enrollment of 30,000+ students into Stride Career Learning programs in FY20.",
        ],
      },
    ],
  },
  {
    name: "Community operations & leadership",
    roles: [
      {
        title: "Regional Registrar",
        organization: "AYSO Region 1159",
        period: "Feb 2022 – Jan 2024",
        location: "Alcoa, TN",
        highlights: [
          "Managed youth registration, background clearances, and roster allocations; hosted registration drives to grow participation.",
          "Maintained roster integrity and enrollment analytics for regional board planning.",
          "Negotiated local sponsorships and managed web and social outreach.",
        ],
      },
      {
        title: "U-10 Head Coach",
        organization: "AYSO Region 1159",
        period: "Sep 2021 – Feb 2024",
        location: "Alcoa, TN",
        highlights: [
          "Led U-10 player development, practice planning, and inclusive game-day management.",
          "Coordinated with parents and league officials on schedules, safety, and seasonal operations.",
        ],
      },
      {
        title: "House Manager",
        organization: "D&S Community Services",
        period: "Sep 2018 – Mar 2019",
        location: "Maryville, TN",
        highlights: [
          "Managed residential operations, staff training, and state healthcare compliance documentation.",
          "Directed crisis intervention and coordinated with multidisciplinary oversight teams.",
        ],
      },
      {
        title: "Volunteer Staff",
        organization: "Big Brother Big Sister Foundation, Inc.",
        period: "Aug 2016 – Jun 2017",
        location: "Maryville, TN",
        highlights: [
          "Supported youth mentorship logistics, events, and safe program environments.",
        ],
      },
      {
        title: "Emergency Relief Volunteer",
        organization: "Volunteer East Tennessee (Gatlinburg wildfire recovery)",
        period: "Dec 2016 – Jan 2017",
        location: "East TN",
        highlights: [
          "Assisted disaster recovery after the 2016 Gatlinburg wildfires—intake, aid distribution, and support for displaced families and first responders.",
        ],
      },
    ],
  },
];
