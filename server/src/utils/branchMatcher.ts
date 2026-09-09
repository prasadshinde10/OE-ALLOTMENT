/**
 * Branch matching utility for First-Year Club target program access control.
 * Normalizes student branch strings to canonical program codes and checks eligibility.
 */

const PROGRAM_CODE_MAP: Record<string, string> = {
  // Mechanical Engineering
  'ME': 'ME',
  'FY-ME': 'ME',
  'FY-MECH': 'ME',
  'MECH': 'ME',
  'MECHANICAL': 'ME',
  'MECHANICAL ENGINEERING': 'ME',
  // Mechatronics Engineering
  'MTX': 'MTX',
  'FY-MTX': 'MTX',
  'MECHATRONICS': 'MTX',
  'MECHATRONICS ENGINEERING': 'MTX',
  // Electrical Engineering
  'EE': 'EE',
  'FY-EE': 'EE',
  'ELECTRICAL': 'EE',
  'ELECTRICAL ENGINEERING': 'EE',
  // Electronics and Telecommunication Engineering
  'E&TC': 'E&TC',
  'FY-E&TC': 'E&TC',
  'ENTC': 'E&TC',
  'FY-ENTC': 'E&TC',
  'ELECTRONICS AND TELECOMMUNICATION': 'E&TC',
  'ELECTRONICS AND TELECOMMUNICATION ENGINEERING': 'E&TC',
  // Computer Science and Engineering
  'CSE': 'CSE',
  'FY-CSE': 'CSE',
  'COMPUTER SCIENCE': 'CSE',
  'COMPUTER SCIENCE AND ENGINEERING': 'CSE',
  // Artificial Intelligence and Data Science
  'AI&DS': 'AI&DS',
  'FY-AI&DS': 'AI&DS',
  'AIDS': 'AI&DS',
  'FY-AIDS': 'AI&DS',
  'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE': 'AI&DS',
  // Computer Science and Design
  'CSD': 'CSD',
  'FY-CSD': 'CSD',
  'COMPUTER SCIENCE AND DESIGN': 'CSD',
  // Electronics and Computer Engineering
  'E&CE': 'E&CE',
  'FY-E&CE': 'E&CE',
  'ECE': 'E&CE',
  'FY-ECE': 'E&CE',
  'ELECTRONICS AND COMPUTER ENGINEERING': 'E&CE',
  // Agricultural Engineering
  'AE': 'AE',
  'FY-AE': 'AE',
  'AGRICULTURAL': 'AE',
  'AGRICULTURAL ENGINEERING': 'AE',
  // Plastic & Polymer Engineering
  'PPE': 'PPE',
  'FY-PPE': 'PPE',
  'PLASTIC & POLYMER ENGINEERING': 'PPE',
  'PLASTIC AND POLYMER ENGINEERING': 'PPE',
  // Civil Engineering
  'CIVIL': 'CIVIL',
  'FY-CIVIL': 'CIVIL',
  'CIVIL ENGINEERING': 'CIVIL',
  'CE': 'CIVIL',
  'FY-CE': 'CIVIL',
};

/**
 * Normalize a branch string to its canonical program code.
 * Returns the canonical code or the original string uppercased if not found.
 */
export function normalizeBranch(branch: string): string {
  if (!branch) return '';
  const key = branch.trim().toUpperCase();
  return PROGRAM_CODE_MAP[key] || key;
}

/**
 * Check if a student's branch is eligible for a club with given target branches.
 * If targetBranches is empty or null, the club is open to all branches.
 */
export function isBranchEligible(studentBranch: string, targetBranches: string[]): boolean {
  // Empty targetBranches means open to all
  if (!targetBranches || targetBranches.length === 0) return true;
  
  const normalizedStudent = normalizeBranch(studentBranch);
  if (!normalizedStudent) return false;
  
  const normalizedTargets = targetBranches.map(normalizeBranch);
  return normalizedTargets.includes(normalizedStudent);
}
