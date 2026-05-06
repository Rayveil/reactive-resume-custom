export const profileSourceStorageKey = "dashboard.profile.source";

export type BasicInfo = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  customFields: ProfileCustomField[];
};

export type ProfilePicture = {
  hidden: boolean;
  url: string;
  size: number;
  rotation: number;
  aspectRatio: number;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  shadowColor: string;
  shadowWidth: number;
};

export type ProfileSummary = {
  title: string;
  columns: number;
  hidden: boolean;
  content: string;
};

export type ProfileCustomField = {
  id: string;
  icon: string;
  text: string;
  link: string;
};

export type ProfileLink = {
  id: string;
  icon: string;
  network: string;
  username: string;
  websiteUrl: string;
  websiteLabel: string;
};

export type ProfileEducation = {
  id: string;
  school: string;
  degree: string;
  area: string;
  grade: string;
  location: string;
  period: string;
  websiteUrl: string;
  websiteLabel: string;
  description: string;
};

export type ProfileLanguage = {
  id: string;
  language: string;
  fluency: string;
  level: number;
};

export type ProfileInterest = {
  id: string;
  icon: string;
  name: string;
  keywords: string;
};

export type ProfileAward = {
  id: string;
  title: string;
  awarder: string;
  date: string;
  websiteUrl: string;
  websiteLabel: string;
  description: string;
};

export type ProfileCertification = {
  id: string;
  title: string;
  issuer: string;
  date: string;
  websiteUrl: string;
  websiteLabel: string;
  description: string;
};

export type ProfilePublication = {
  id: string;
  title: string;
  publisher: string;
  date: string;
  websiteUrl: string;
  websiteLabel: string;
  description: string;
};

export type ProfileVolunteer = {
  id: string;
  organization: string;
  location: string;
  period: string;
  websiteUrl: string;
  websiteLabel: string;
  description: string;
};

export type ProfileReference = {
  id: string;
  name: string;
  position: string;
  websiteUrl: string;
  websiteLabel: string;
  phone: string;
  description: string;
};

export type ProfileSkill = {
  id: string;
  name: string;
};

export type ProfileProject = {
  id: string;
  name: string;
  description: string;
};

export type WorkExperience = {
  id: string;
  company: string;
  role: string;
  period: string;
  description: string;
};

export type ProfileSourceData = {
  picture: ProfilePicture;
  basicInfo: BasicInfo;
  summary: ProfileSummary;
  profiles: ProfileLink[];
  education: ProfileEducation[];
  languages: ProfileLanguage[];
  interests: ProfileInterest[];
  awards: ProfileAward[];
  certifications: ProfileCertification[];
  publications: ProfilePublication[];
  volunteer: ProfileVolunteer[];
  references: ProfileReference[];
  skills: ProfileSkill[];
  projects: ProfileProject[];
  workExperiences: WorkExperience[];
};

export const mergeProfileSource = (value?: Partial<ProfileSourceData> | null): ProfileSourceData => {
  const mock = createMockProfileSource();

  return {
    picture: {
      ...mock.picture,
      ...(value?.picture ?? {}),
    },
    basicInfo: {
      ...mock.basicInfo,
      ...(value?.basicInfo ?? {}),
    },
    summary: {
      ...mock.summary,
      ...(value?.summary ?? {}),
    },
    profiles: Array.isArray(value?.profiles) ? value.profiles : mock.profiles,
    education: Array.isArray(value?.education) ? value.education : mock.education,
    languages: Array.isArray(value?.languages) ? value.languages : mock.languages,
    interests: Array.isArray(value?.interests) ? value.interests : mock.interests,
    awards: Array.isArray(value?.awards) ? value.awards : mock.awards,
    certifications: Array.isArray(value?.certifications) ? value.certifications : mock.certifications,
    publications: Array.isArray(value?.publications) ? value.publications : mock.publications,
    volunteer: Array.isArray(value?.volunteer) ? value.volunteer : mock.volunteer,
    references: Array.isArray(value?.references) ? value.references : mock.references,
    skills: Array.isArray(value?.skills) ? value.skills : mock.skills,
    projects: Array.isArray(value?.projects) ? value.projects : mock.projects,
    workExperiences: Array.isArray(value?.workExperiences) ? value.workExperiences : mock.workExperiences,
  };
};

export const createMockProfileSource = (): ProfileSourceData => ({
  picture: {
    hidden: false,
    url: "",
    size: 80,
    rotation: 0,
    aspectRatio: 1,
    borderRadius: 0,
    borderColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 0,
    shadowColor: "rgba(0, 0, 0, 0.5)",
    shadowWidth: 0,
  },
  basicInfo: {
    name: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    customFields: [],
  },
  summary: {
    title: "Summary",
    columns: 1,
    hidden: false,
    content: "",
  },
  profiles: [
    {
      id: "profile-1",
      icon: "",
      network: "LinkedIn",
      username: "",
      websiteUrl: "",
      websiteLabel: "",
    },
  ],
  education: [],
  languages: [],
  interests: [],
  awards: [],
  certifications: [],
  publications: [],
  volunteer: [],
  references: [],
  skills: [
    { id: "skill-1", name: "TypeScript" },
    { id: "skill-2", name: "React" },
  ],
  projects: [
    {
      id: "project-1",
      name: "Portfolio Website",
      description: "Built a responsive portfolio with React and TailwindCSS.",
    },
  ],
  workExperiences: [
    {
      id: "work-1",
      company: "Example Corp",
      role: "Frontend Developer",
      period: "2023 - Present",
      description: "Developed reusable UI components and improved page performance.",
    },
  ],
  references: [],
});
