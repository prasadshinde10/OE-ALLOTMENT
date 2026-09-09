import Club from '../models/Club';

interface ClubSeedData {
  name: string;
  code: string;
  category: 'co-curricular' | 'extra-curricular';
  targetBranches: string[];
  capacity: number;
  term: string;
}

const CO_CURRICULAR_CLUBS: ClubSeedData[] = [
  {
    name: 'Mobility & Aerospace Club',
    code: 'FY-CC-01',
    category: 'co-curricular',
    targetBranches: ['ME', 'MTX', 'EE', 'E&TC'],
    capacity: 120,
    term: 'Sem-1',
  },
  {
    name: 'AI, Data Science & Quantum Computing Club',
    code: 'FY-CC-02',
    category: 'co-curricular',
    targetBranches: ['AI&DS', 'CSE', 'CSD', 'E&CE'],
    capacity: 120,
    term: 'Sem-1',
  },
  {
    name: 'Smart Farming & Agri-Tech Innovators Club',
    code: 'FY-CC-03',
    category: 'co-curricular',
    targetBranches: ['AE', 'ME', 'AI&DS'],
    capacity: 90,
    term: 'Sem-1',
  },
  {
    name: 'Extended Reality (XR) & UI/UX Design Studio',
    code: 'FY-CC-04',
    category: 'co-curricular',
    targetBranches: ['CSD', 'CSE', 'AI&DS'],
    capacity: 90,
    term: 'Sem-1',
  },
  {
    name: 'Advanced Materials & Sustainable Plastics Club',
    code: 'FY-CC-05',
    category: 'co-curricular',
    targetBranches: ['PPE', 'ME'],
    capacity: 60,
    term: 'Sem-1',
  },
  {
    name: 'Robotics, Automation & Industrial IoT (IIoT) Club',
    code: 'FY-CC-06',
    category: 'co-curricular',
    targetBranches: ['MTX', 'EE', 'E&TC', 'CSE', 'E&CE'],
    capacity: 150,
    term: 'Sem-1',
  },
  {
    name: 'Embedded Systems & Chip Design Club',
    code: 'FY-CC-07',
    category: 'co-curricular',
    targetBranches: ['E&CE', 'E&TC', 'EE', 'CSE'],
    capacity: 120,
    term: 'Sem-1',
  },
  {
    name: 'Additive Manufacturing & Rapid Prototyping Club',
    code: 'FY-CC-08',
    category: 'co-curricular',
    targetBranches: ['ME', 'PPE', 'CSD', 'MTX'],
    capacity: 120,
    term: 'Sem-1',
  },
  {
    name: 'Cyber Security & Cloud Architecture Club',
    code: 'FY-CC-09',
    category: 'co-curricular',
    targetBranches: ['CSE', 'E&CE', 'AI&DS'],
    capacity: 90,
    term: 'Sem-1',
  },
  {
    name: 'Renewable Energy & Smart Grid Systems Club',
    code: 'FY-CC-10',
    category: 'co-curricular',
    targetBranches: ['EE', 'E&TC', 'AE', 'MTX'],
    capacity: 120,
    term: 'Sem-1',
  },
  {
    name: 'Drone & UAV Technology Club',
    code: 'FY-CC-11',
    category: 'co-curricular',
    targetBranches: ['ME', 'MTX', 'E&TC', 'CSE', 'AI&DS', 'AE'],
    capacity: 180,
    term: 'Sem-1',
  },
  {
    name: 'Space & Astronomy Club',
    code: 'FY-CC-12',
    category: 'co-curricular',
    targetBranches: ['ME', 'EE', 'E&TC', 'CSE', 'AI&DS', 'CSD'],
    capacity: 180,
    term: 'Sem-1',
  },
];

const EXTRA_CURRICULAR_CLUBS: ClubSeedData[] = [
  {
    name: 'Cultural Club',
    code: 'FY-EC-01',
    category: 'extra-curricular',
    targetBranches: [],
    capacity: 200,
    term: 'Sem-1',
  },
  {
    name: 'Music Club',
    code: 'FY-EC-02',
    category: 'extra-curricular',
    targetBranches: [],
    capacity: 200,
    term: 'Sem-1',
  },
  {
    name: 'Dance Club',
    code: 'FY-EC-03',
    category: 'extra-curricular',
    targetBranches: [],
    capacity: 200,
    term: 'Sem-1',
  },
  {
    name: 'Sports Club',
    code: 'FY-EC-04',
    category: 'extra-curricular',
    targetBranches: [],
    capacity: 200,
    term: 'Sem-1',
  },
  {
    name: 'Fine Arts Club',
    code: 'FY-EC-05',
    category: 'extra-curricular',
    targetBranches: [],
    capacity: 200,
    term: 'Sem-1',
  },
  {
    name: 'Drama & Theatre Club',
    code: 'FY-EC-06',
    category: 'extra-curricular',
    targetBranches: [],
    capacity: 200,
    term: 'Sem-1',
  },
  {
    name: 'Debate & Literary Club',
    code: 'FY-EC-07',
    category: 'extra-curricular',
    targetBranches: [],
    capacity: 200,
    term: 'Sem-1',
  },
  {
    name: 'Photography & Film Club',
    code: 'FY-EC-08',
    category: 'extra-curricular',
    targetBranches: [],
    capacity: 200,
    term: 'Sem-1',
  },
  {
    name: 'Social Service & Community Outreach Club',
    code: 'FY-EC-09',
    category: 'extra-curricular',
    targetBranches: [],
    capacity: 200,
    term: 'Sem-1',
  },
];

export async function seedFirstYearClubs(): Promise<void> {
  const allClubs = [...CO_CURRICULAR_CLUBS, ...EXTRA_CURRICULAR_CLUBS];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const clubData of allClubs) {
    try {
      const existing = await Club.findOne({
        code: clubData.code,
        category: clubData.category,
        year: 1,
        term: clubData.term,
      });

      if (existing) {
        // Update targetBranches and ensure description is empty
        existing.targetBranches = clubData.targetBranches;
        existing.description = '';
        await existing.save();
        updated++;
      } else {
        await Club.create({
          ...clubData,
          year: 1,
          description: '',
          seatsFilled: 0,
          isActive: true,
          divisions: [],
        });
        created++;
      }
    } catch (err: any) {
      if (err.code === 11000) {
        skipped++;
      } else {
        console.warn(`⚠️ Failed to seed club ${clubData.code}:`, err.message);
      }
    }
  }

  console.log(`🎯 First-Year Club Seeding: ${created} created, ${updated} updated, ${skipped} skipped (total: ${allClubs.length})`);
}
