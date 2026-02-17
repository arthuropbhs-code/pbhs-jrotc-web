// src/constants.js

export const ROLE_HIERARCHY = {
  'admin': 100,
  
  // Tier: Battalion Top 4 (Level 90)
  'battalion_commander': 90,
  'battalion_dcommander': 90,
  'battalion_xo': 90,          // Grayson's Role
  'battalion_csm': 90,
  'battalion_staff_officer': 90, 

  // Tier: Battalion Executive Staff (Level 80)
  's1_adjutant': 80,
  's2_intelligence': 80,
  's3_operations': 80,
  's4_logistics': 80,
  's5_public_affairs': 80,
  's6_technology': 80,
  's7_special_projects': 80,

  // Tier: Company Command (Level 55-45)
  'company_commander': 55,
  'company_xo': 50,
  'company_1sgt': 45,
  'master_sergeant': 40,

  // Tier: Staff Assistants (Level 35)
  's1_assistant': 35, 's2_assistant': 35, 's3_assistant': 35, 
  's4_assistant': 35, 's5_assistant': 35, 's6_assistant': 35, 's7_assistant': 35,

  // Tier: Field Leadership (Level 25-5)
  'platoon_leader': 25,
  'platoon_sergeant': 20,
  'squad_leader': 15,
  'squad_member': 5,
  'cadet': 1
};

export const EVENT_TYPES = [
  'Inspection', 'Service', 'Drill', 'PT', 'Meeting', 
  'Ceremony', 'Raiders', 'JLAB', 'Drones', 'Gameday', 'Private Practice'
];