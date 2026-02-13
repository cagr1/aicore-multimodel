// Diff Engine - Compute differences between files

/**
 * Compute unified diff between two strings
 * @param {string} original - Original content
 * @param {string} modified - Modified content
 * @param {string} filePath - File path for diff header
 * @returns {string} Unified diff format
 */
export function computeDiff(original, modified, filePath) {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  // Simple line-by-line diff
  const diff = [];
  diff.push(`--- ${filePath}`);
  diff.push(`+++ ${filePath}`);
  
  let i = 0;
  let j = 0;
  let additions = 0;
  let deletions = 0;
  
  while (i < originalLines.length || j < modifiedLines.length) {
    const origLine = originalLines[i];
    const modLine = modifiedLines[j];
    
    if (origLine === modLine) {
      // Lines are equal
      diff.push(` ${origLine || ''}`);
      i++;
      j++;
    } else if (modLine !== undefined && (origLine === undefined || !remainingContains(originalLines, i, modLine))) {
      // Addition
      diff.push(`+${modLine}`);
      additions++;
      j++;
    } else if (origLine !== undefined) {
      // Deletion
      diff.push(`-${origLine}`);
      deletions++;
      i++;
    }
  }
  
  return {
    diff: diff.join('\n'),
    additions,
    deletions
  };
}

/**
 * Check if a line exists in remaining original lines
 */
function remainingContains(lines, start, line) {
  for (let i = start; i < lines.length; i++) {
    if (lines[i] === line) return true;
  }
  return false;
}

/**
 * Generate diff for a file change
 * @param {Object} change - FileChange object
 * @returns {Object} DiffResult
 */
export function diffFile(change) {
  const { file, content, originalContent } = change;
  
  if (change.type === 'create') {
    return {
      success: true,
      file,
      diff: `+++ ${file}\n${content.split('\n').map(l => '+' + l).join('\n')}`,
      additions: content.split('\n').length,
      deletions: 0
    };
  }
  
  if (change.type === 'delete') {
    return {
      success: true,
      file,
      diff: `--- ${file}\n${originalContent.split('\n').map(l => '-' + l).join('\n')}`,
      additions: 0,
      deletions: originalContent.split('\n').length
    };
  }
  
  if (change.type === 'update') {
    const result = computeDiff(originalContent, content, file);
    return {
      success: true,
      file,
      diff: result.diff,
      additions: result.additions,
      deletions: result.deletions
    };
  }
  
  return {
    success: false,
    file,
    diff: '',
    additions: 0,
    deletions: 0
  };
}

export default { computeDiff, diffFile };
