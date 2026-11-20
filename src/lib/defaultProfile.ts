import { ProfileSchema, type Profile } from "./schemas";

// Seed profile built ONLY from Jamee's public portfolio. Edit it on /profile.
export const DEFAULT_PROFILE: Profile = ProfileSchema.parse({
  name: "Jamee Raza",
  email: "mjamijami46@gmail.com",
  phone: "+92 310 300 1161",
  location: "Karachi, Pakistan",
  summary:
    "Software Engineering student (BS, SMIU, 2023-2027) and full-stack developer who builds React/Next.js/Node.js applications, REST APIs and LLM-based AI assistants. Recently completed an Agentic AI program. Open to junior full-stack, front-end and AI roles and internships.",
  skills: [
    "JavaScript", "React", "Next.js", "React Native", "HTML5", "CSS3",
    "Node.js", "Express.js", "REST API design", "Middleware", "API integration",
    "MongoDB", "Mongoose", "MySQL", "SQLite", "JWT", "bcrypt",
    "Gemini API", "Tool calling", "Agent loops", "Memory", "RAG basics", "MCP basics", "Evals",
    "C", "C++", "C#", "Git", "GitHub", "Postman", "Thunder Client", "Wix",
  ],
  experience: [
    {
      role: "Front-End Developer",
      company: "360 Expert Solution",
      period: "Apr 2025 - Jun 2025",
      highlights: [
        "Developed responsive web interfaces and dynamic UI components with cross-browser compatibility.",
        "Fixed layout issues and refined front-end styling to improve usability and visual consistency.",
      ],
    },
    {
      role: "Web Developer & Quality Checker",
      company: "Cosmic 365 AI",
      period: "2025",
      highlights: [
        "Customized responsive client-facing web layouts using Wix and supported data analysis tasks.",
        "Performed quality checks on web features for visual consistency and functional accuracy.",
      ],
    },
  ],
  projects: [
    {
      name: "RecallMate-AI",
      description:
        "Chat assistant that saves and recalls notes with tool calling in a bounded agent loop, per-session SQLite memory, retry/timeout/model fallback, a guardrail and an automated eval suite.",
      tech: ["Node.js", "Express.js", "SQLite", "Gemini API"],
      link: "https://github.com/Jamee21/recallmate-ai",
    },
    {
      name: "Portfolio AI Assistant",
      description: "Streaming chat assistant on my portfolio that answers questions about my skills and projects from a fixed profile.",
      tech: ["Next.js", "Gemini API"],
      link: "https://github.com/Jamee21/jamee-portfolio",
    },
    {
      name: "Auth & User Management API",
      description: "RESTful backend for registration, authentication, authorization and user management with hashed passwords and JWT.",
      tech: ["Node.js", "Express.js", "MongoDB", "JWT", "bcrypt"],
      link: "https://github.com/Jamee21/User-Authentication-User-Management-REST-API",
    },
    {
      name: "Skill Swap App",
      description: "Platform where users share skills, discover others and connect for skill exchange.",
      tech: ["React", "JavaScript", "Node.js", "MongoDB"],
      link: "https://github.com/Jamee21/skill-swap-app",
    },
    {
      name: "Fitness Tracker",
      description: "Fitness tracking app for monitoring workouts, activities, goals and personal progress.",
      tech: ["React", "JavaScript", "REST API"],
      link: "https://github.com/Jamee21/fitness-tracker-app",
    },
    {
      name: "Hotel Welcome Screen",
      description: "Hotel TV welcome system displaying guest info, services, billing and promotional content (private repository).",
      tech: ["React", "Node.js", "Express.js", "MySQL", "Android TV"],
      link: null,
    },
  ],
  education: [
    { degree: "BS Software Engineering", institution: "Sindh Madressatul Islam University, Karachi", period: "2023 - 2027 (in progress)" },
    { degree: "Intermediate in Computer Science", institution: "Govt. Kohsar Degree College, Hyderabad", period: "2020 - 2022" },
  ],
  links: ["https://github.com/Jamee21", "https://jamee-portfolio-beta.vercel.app/"],
});
