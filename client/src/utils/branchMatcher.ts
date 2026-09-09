/**
 * Branch matching utility for First-Year Club target program access control.
 * Normalizes student branch strings (full names, aliases, codes) to canonical program codes.
 */

export const PROGRAM_CODE_MAP: Record<string, string> = {
  // Mechanical Engineering
  'ME': 'ME',
  'FY-ME': 'ME',
  'FY-MECH': 'ME',
  'MECH': 'ME',
  'MECHANICAL': 'ME',
  'MECHANICAL ENGINEERING': 'ME',
  'MECHANICAL ENGG': 'ME',
  // Mechatronics Engineering
  'MTX': 'MTX',
  'FY-MTX': 'MTX',
  'MECHATRONICS': 'MTX',
  'MECHATRONICS ENGINEERING': 'MTX',
  'MECHATRONICS ENGG': 'MTX',
  // Electrical Engineering
  'EE': 'EE',
  'FY-EE': 'EE',
  'ELECTRICAL': 'EE',
  'ELECTRICAL ENGINEERING': 'EE',
  'ELECTRICAL ENGG': 'EE',
  // Electronics and Telecommunication Engineering
  'E&TC': 'E&TC',
  'FY-E&TC': 'E&TC',
  'ENTC': 'E&TC',
  'FY-ENTC': 'E&TC',
  'ETC': 'E&TC',
  'FY-ETC': 'E&TC',
  'ELECTRONICS AND TELECOMMUNICATION': 'E&TC',
  'ELECTRONICS & TELECOMMUNICATION': 'E&TC',
  'ELECTRONICS AND TELECOMMUNICATION ENGINEERING': 'E&TC',
  'ELECTRONICS & TELECOMMUNICATION ENGINEERING': 'E&TC',
  'ELECTRONICS AND TELECOMMUNICATION ENGG': 'E&TC',
  'ELECTRONICS & TELECOMMUNICATION ENGG': 'E&TC',
  // Computer Science and Engineering
  'CSE': 'CSE',
  'FY-CSE': 'CSE',
  'COMPUTER SCIENCE': 'CSE',
  'COMPUTER SCIENCE AND ENGINEERING': 'CSE',
  'COMPUTER SCIENCE & ENGINEERING': 'CSE',
  'COMPUTER SCIENCE AND ENGG': 'CSE',
  'COMPUTER SCIENCE & ENGG': 'CSE',
  // Artificial Intelligence and Data Science
  'AI&DS': 'AI&DS',
  'FY-AI&DS': 'AI&DS',
  'AIDS': 'AI&DS',
  'FY-AIDS': 'AI&DS',
  'AI AND DS': 'AI&DS',
  'AI & DS': 'AI&DS',
  'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE': 'AI&DS',
  'ARTIFICIAL INTELLIGENCE & DATA SCIENCE': 'AI&DS',
  'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE ENGG': 'AI&DS',
  'ARTIFICIAL INTELLIGENCE & DATA SCIENCE ENGG': 'AI&DS',
  // Computer Science and Design
  'CSD': 'CSD',
  'FY-CSD': 'CSD',
  'COMPUTER SCIENCE AND DESIGN': 'CSD',
  'COMPUTER SCIENCE & DESIGN': 'CSD',
  'COMPUTER SCIENCE AND DESIGN ENGG': 'CSD',
  'COMPUTER SCIENCE & DESIGN ENGG': 'CSD',
  // Electronics and Computer Engineering
  'E&CE': 'E&CE',
  'FY-E&CE': 'E&CE',
  'ECE': 'E&CE',
  'FY-ECE': 'E&CE',
  'ELECTRONICS AND COMPUTER': 'E&CE',
  'ELECTRONICS & COMPUTER': 'E&CE',
  'ELECTRONICS AND COMPUTER ENGINEERING': 'E&CE',
  'ELECTRONICS & COMPUTER ENGINEERING': 'E&CE',
  'ELECTRONICS AND COMPUTER ENGG': 'E&CE',
  'ELECTRONICS & COMPUTER ENGG': 'E&CE',
  // Agricultural Engineering
  'AE': 'AE',
  'FY-AE': 'AE',
  'AGRICULTURAL': 'AE',
  'AGRICULTURAL ENGINEERING': 'AE',
  'AGRICULTURAL ENGG': 'AE',
  'AGRICULTURE': 'AE',
  'AGRICULTURE ENGINEERING': 'AE',
  // Plastic & Polymer Engineering
  'PPE': 'PPE',
  'FY-PPE': 'PPE',
  'PLASTIC & POLYMER ENGINEERING': 'PPE',
  'PLASTIC AND POLYMER ENGINEERING': 'PPE',
  'PLASTIC & POLYMER ENGG': 'PPE',
  'PLASTIC AND POLYMER ENGG': 'PPE',
  'PLASTIC & POLYMER': 'PPE',
  'PLASTIC AND POLYMER': 'PPE',
  'POLYMER': 'PPE',
  'POLYMER ENGINEERING': 'PPE',
  // Civil Engineering
  'CIVIL': 'CIVIL',
  'FY-CIVIL': 'CIVIL',
  'CIVIL ENGINEERING': 'CIVIL',
  'CIVIL ENGG': 'CIVIL',
  'CE': 'CIVIL',
  'FY-CE': 'CIVIL',
};

/**
 * Normalize a branch string to its canonical program code.
 * Handles full names, abbreviations, FY- prefixes, symbols, and keyword fallbacks.
 */
export function normalizeBranch(branch: string): string {
  if (!branch) return '';
  const raw = branch.trim();
  const upper = raw.toUpperCase();

  // 1. Direct exact map lookup
  if (PROGRAM_CODE_MAP[upper]) {
    return PROGRAM_CODE_MAP[upper];
  }

  // 2. Clean common prefixes and suffixes
  const cleaned = upper
    .replace(/^FY\s*[-_:]\s*/i, '')
    .replace(/^B\.?\s*TECH\s*[-_:]?\s*/i, '')
    .replace(/^(DEPARTMENT|DEPT)\s+OF\s+/i, '')
    .replace(/\s*\([^)]*\)/g, '') // remove parenthetical like (CSE)
    .replace(/\s+/g, ' ')
    .trim();

  if (PROGRAM_CODE_MAP[cleaned]) {
    return PROGRAM_CODE_MAP[cleaned];
  }

  // Normalize & vs AND
  const withAnd = cleaned.replace(/&/g, ' AND ').replace(/\s+/g, ' ').trim();
  if (PROGRAM_CODE_MAP[withAnd]) {
    return PROGRAM_CODE_MAP[withAnd];
  }

  const withAmp = cleaned.replace(/\bAND\b/g, '&').replace(/\s+/g, ' ').trim();
  if (PROGRAM_CODE_MAP[withAmp]) {
    return PROGRAM_CODE_MAP[withAmp];
  }

  // 3. Fallback keyword heuristic matching (order is critical!)
  if (cleaned.includes('DESIGN') || cleaned.includes('CSD')) {
    return 'CSD';
  }
  if (
    cleaned.includes('ELECTRONICS AND COMPUTER') ||
    cleaned.includes('ELECTRONICS & COMPUTER') ||
    cleaned.includes('E&CE') ||
    cleaned === 'ECE'
  ) {
    return 'E&CE';
  }
  if (
    cleaned.includes('ARTIFICIAL') ||
    cleaned.includes('DATA SCIENCE') ||
    cleaned.includes('AI&DS') ||
    cleaned.includes('AIDS') ||
    /\bAI\b/.test(cleaned)
  ) {
    return 'AI&DS';
  }
  if (cleaned.includes('MECHATRONIC') || cleaned.includes('MTX')) {
    return 'MTX';
  }
  if (
    cleaned.includes('TELECOMMUNICATION') ||
    cleaned.includes('TELECOM') ||
    cleaned.includes('E&TC') ||
    cleaned.includes('ENTC')
  ) {
    return 'E&TC';
  }
  if (
    cleaned.includes('COMPUTER') ||
    cleaned.includes('CSE') ||
    cleaned.includes('COMP')
  ) {
    return 'CSE';
  }
  if (cleaned.includes('MECHANIC') || cleaned.includes('MECH')) {
    return 'ME';
  }
  if (cleaned.includes('ELECTRICAL')) {
    return 'EE';
  }
  if (cleaned.includes('AGRICULTUR') || cleaned.includes('AGRI')) {
    return 'AE';
  }
  if (
    cleaned.includes('POLYMER') ||
    cleaned.includes('PLASTIC') ||
    cleaned.includes('PPE')
  ) {
    return 'PPE';
  }
  if (cleaned.includes('CIVIL')) {
    return 'CIVIL';
  }

  return upper;
}

/**
 * Check if a student's branch is eligible for a club with given target branches.
 * If targetBranches is empty or null, the club is open to all branches.
 */
export function isBranchEligible(studentBranch: string, targetBranches: string[]): boolean {
  // Empty targetBranches means open to all branches
  if (!targetBranches || targetBranches.length === 0) return true;
  
  const normalizedStudent = normalizeBranch(studentBranch);
  if (!normalizedStudent) return false;
  
  const normalizedTargets = targetBranches.map(normalizeBranch);
  return normalizedTargets.includes(normalizedStudent);
}
