import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const TWO_SUM = {
  slug: 'two-sum',
  title: 'Two Sum',
  description: `Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers such that they add up to \`target\`.

You may assume that each input has exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

**Input format (stdin):**
- Line 1: the array as JSON (e.g. \`[2,7,11,15]\`)
- Line 2: the target integer (e.g. \`9\`)

**Output format (stdout):**
- The two indices as a JSON array (e.g. \`[0,1]\`)

**Example 1**
\`\`\`
Input:
[2,7,11,15]
9

Output:
[0,1]
\`\`\`

**Example 2**
\`\`\`
Input:
[3,2,4]
6

Output:
[1,2]
\`\`\`
`,
  difficulty: 'easy',
  tags: ['array', 'hash-table'],
  starterCode: {
    javascript: `function twoSum(nums, target) {
  // your solution here

}

// ---- stdin handler (don't modify) ----
const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n')
const nums = JSON.parse(lines[0])
const target = parseInt(lines[1], 10)
console.log(JSON.stringify(twoSum(nums, target)))
`,
    python: `import sys, json

def two_sum(nums, target):
    # your solution here
    pass

# ---- stdin handler (don't modify) ----
lines = sys.stdin.read().strip().split('\\n')
nums = json.loads(lines[0])
target = int(lines[1])
print(json.dumps(two_sum(nums, target)))
`,
  },
  testCases: [
    { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' },
    { input: '[3,2,4]\n6', expectedOutput: '[1,2]' },
    { input: '[3,3]\n6', expectedOutput: '[0,1]' },
    { input: '[-1,-2,-3,-4,-5]\n-8', expectedOutput: '[2,4]' },
  ],
  solutions: {
    javascript: {
      correct: `function twoSum(nums, target) {
  const seen = new Map()
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i]
    if (seen.has(need)) return [seen.get(need), i]
    seen.set(nums[i], i)
  }
  return []
}

const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n')
const nums = JSON.parse(lines[0])
const target = parseInt(lines[1], 10)
console.log(JSON.stringify(twoSum(nums, target)))
`,
      wrong: `function twoSum(nums, target) {
  // naive off-by-one: returns wrong pair on some inputs
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j]
    }
  }
  return []
}

const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n')
const nums = JSON.parse(lines[0])
const target = parseInt(lines[1], 10)
console.log(JSON.stringify(twoSum(nums, target)))
`,
    },
    python: {
      correct: `import sys, json

def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        need = target - n
        if need in seen:
            return [seen[need], i]
        seen[n] = i
    return []

lines = sys.stdin.read().strip().split('\\n')
nums = json.loads(lines[0])
target = int(lines[1])
print(json.dumps(two_sum(nums, target)))
`,
      wrong: `import sys, json

def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []

lines = sys.stdin.read().strip().split('\\n')
nums = json.loads(lines[0])
target = int(lines[1])
print(json.dumps(two_sum(nums, target)))
`,
    },
  },
  timeLimitMs: 2000,
  memoryLimitMb: 128,
  matchDurationSec: 600,
}

async function main() {
  const existing = await db.problem.findUnique({ where: { slug: TWO_SUM.slug } })
  if (existing) {
    console.log(`Problem "${TWO_SUM.slug}" already exists (id: ${existing.id}), updating...`)
    await db.problem.update({ where: { id: existing.id }, data: TWO_SUM })
  } else {
    const created = await db.problem.create({ data: TWO_SUM })
    console.log(`Created problem "${TWO_SUM.slug}" (id: ${created.id})`)
  }
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e)
    db.$disconnect()
    process.exit(1)
  })
