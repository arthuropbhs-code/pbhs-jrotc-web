// src/constants.js

export const ROLE_HIERARCHY = {
  // Tier: Instructors (Level 100-95)
  'senior_army_instructor': 100,
  'army_instructor': 95,

  // Tier: Battalion Command (Level 90-80)
  'battalion_commander': 90,
  'battalion_xo': 85,
  'battalion_csm': 85,
  'sergeant_major': 80,

  // Tier: Battalion Staff (Level 70)
  's1_adjutant': 70,
  's2_intelligence': 70,
  's3_operations': 70,
  's4_logistics': 70,
  's5_public_affairs': 70,
  's6_technology': 70,
  's7_special_projects': 70,

  // Tier: Company Command (Level 55-45)
  'company_commander': 55,
  'company_xo': 50,
  'company_1sg': 45,

  // Tier: Company Staff Assistants (Level 35)
  'company_s1_assistant': 35,
  'company_s2_assistant': 35,
  'company_s3_assistant': 35,
  'company_s4_assistant': 35,
  'company_s5_assistant': 35,
  'company_s6_assistant': 35,
  'company_s7_assistant': 35,

  // Tier: Platoon Leadership (Level 25-20)
  'platoon_leader': 25,
  'platoon_sergeant': 20,

  // Tier: Squad Leadership (Level 15-12)
  'squad_leader': 15,
  'squad_leader_assistant': 12,

  // Tier: Baseline (Level 5-1)
  'squad_member': 5,
  'cadet': 1
};

export const ROLE_LABELS = {
  senior_army_instructor: 'Senior Army Instructor (SAI)',
  army_instructor: 'Army Instructor (AI)',
  battalion_commander: 'Battalion Commander',
  battalion_xo: 'Battalion XO',
  battalion_csm: 'Battalion CSM',
  sergeant_major: 'Sergeant Major',
  s1_adjutant: 'S1 - Adjutant',
  s2_intelligence: 'S2 - Intelligence',
  s3_operations: 'S3 - Operations',
  s4_logistics: 'S4 - Logistics',
  s5_public_affairs: 'S5 - Public Affairs',
  s6_technology: 'S6 - Technology',
  s7_special_projects: 'S7 - Special Projects',
  company_commander: 'Company Commander',
  company_xo: 'Company XO',
  company_1sg: 'Company First Sergeant',
  company_s1_assistant: 'Company S1 Assistant',
  company_s2_assistant: 'Company S2 Assistant',
  company_s3_assistant: 'Company S3 Assistant',
  company_s4_assistant: 'Company S4 Assistant',
  company_s5_assistant: 'Company S5 Assistant',
  company_s6_assistant: 'Company S6 Assistant',
  company_s7_assistant: 'Company S7 Assistant',
  platoon_leader: 'Platoon Leader',
  platoon_sergeant: 'Platoon Sergeant',
  squad_leader: 'Squad Leader',
  squad_leader_assistant: 'Squad Leader Assistant',
  squad_member: 'Squad Member',
  cadet: 'Cadet (Unassigned)'
};

// Sergeant Major and above: full command authority.
export const ADMIN_LEVEL = 80;
// S1-S7 and above: battalion staff authority.
export const STAFF_LEVEL = 70;
// Company First Sergeant and above: baseline leadership/admin-nav visibility.
export const COMMAND_LEVEL = 45;

export const EVENT_TYPES = [
  'Inspection', 'Service', 'Drill', 'PT', 'Meeting', 
  'Ceremony', 'Raiders', 'JLAB', 'Drones', 'Gameday', 'Private Practice'
];