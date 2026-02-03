// src/constants.js

export const ROLE_HIERARCHY = {
  'admin': 100,
  'battalion_4': 90,           // S-4 / Top 4
  'battalion_officer': 90,     // Same power as Top 4, used for Officer assignments
  'battalion_staff': 80,       // Executive Staff
  
  // Battalion Staff (S-1 through S-7)
  's1_battalion': 70,
  's2_battalion': 70,
  's3_battalion': 70,
  's4_battalion': 70,
  's5_battalion': 70,
  's6_battalion': 70,
  's7_battalion': 70,

  // Staff Assistants
  's1_assistant': 60,
  's2_assistant': 60,
  's3_assistant': 60,
  's4_assistant': 60,
  's5_assistant': 60,
  's6_assistant': 60,
  's7_assistant': 60,

  'company_leadership': 40,    // Synced with your AdminUsers dropdown
  'company_staff': 20,
  'platoon_leader': 10,
  'cadet': 1
};

export const EVENT_TYPES = [
  'Inspection',
  'Service',
  'Drill',
  'PT',
  'Meeting',
  'Ceremony',
  'Raiders',
  'JLAB',
  'Marksmanship'
];