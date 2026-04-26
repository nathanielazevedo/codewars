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
  category: 'arrays_hashing',
  tags: ['array', 'hash-table'],
  starterCode: {
    javascript: `function twoSum(nums, target) {
  // your solution here

}
`,
    python: `def two_sum(nums, target):
    # your solution here
    pass
`,
  },
  harness: {
    javascript: `
const __lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n')
const __nums = JSON.parse(__lines[0])
const __target = parseInt(__lines[1], 10)
console.log(JSON.stringify(twoSum(__nums, __target)))
`,
    python: `
import sys as __sys, json as __json
__lines = __sys.stdin.read().strip().split('\\n')
__nums = __json.loads(__lines[0])
__target = int(__lines[1])
print(__json.dumps(two_sum(__nums, __target)))
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
`,
      wrong: `function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j]
    }
  }
  return []
}
`,
    },
    python: {
      correct: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        need = target - n
        if need in seen:
            return [seen[need], i]
        seen[n] = i
    return []
`,
      wrong: `def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []
`,
    },
  },
  timeLimitMs: 2000,
  memoryLimitMb: 128,
  matchDurationSec: 600,
}

const WIZARD_SPELLBOOK = {
  slug: 'wizard-spellbook',
  title: "The Wizard's Mismatched Spellbook",
  description: `An ancient wizard's spellbook is full of nested incantations that look like \`({[]})\`. The magic only works if every opening bracket has a matching closing bracket of the same type, in the right order.

Given an incantation string \`s\` containing only the characters \`()[]{}\`, return \`true\` if the brackets are valid, otherwise \`false\`.

**Input format (stdin):**
- Line 1: the incantation as a JSON string (e.g. \`"({[]})"\`)

**Output format (stdout):**
- \`true\` or \`false\`

**Example 1**
\`\`\`
Input:
"()"

Output:
true
\`\`\`

**Example 2**
\`\`\`
Input:
"([)]"

Output:
false
\`\`\`
`,
  difficulty: 'easy',
  category: 'stack',
  tags: ['stack', 'string'],
  starterCode: {
    javascript: `function isValid(s) {
  // your solution here

}
`,
    python: `def is_valid(s):
    # your solution here
    pass
`,
  },
  harness: {
    javascript: `
const __s = JSON.parse(require('fs').readFileSync(0, 'utf8').trim())
console.log(JSON.stringify(isValid(__s)))
`,
    python: `
import sys as __sys, json as __json
__s = __json.loads(__sys.stdin.read().strip())
print(__json.dumps(is_valid(__s)))
`,
  },
  testCases: [
    { input: '"()"', expectedOutput: 'true' },
    { input: '"()[]{}"', expectedOutput: 'true' },
    { input: '"(]"', expectedOutput: 'false' },
    { input: '"([)]"', expectedOutput: 'false' },
    { input: '"{[]}"', expectedOutput: 'true' },
    { input: '""', expectedOutput: 'true' },
    { input: '"((("', expectedOutput: 'false' },
  ],
  solutions: {
    javascript: {
      correct: `function isValid(s) {
  const stack = []
  const pairs = { ')': '(', ']': '[', '}': '{' }
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch)
    else if (stack.pop() !== pairs[ch]) return false
  }
  return stack.length === 0
}
`,
      wrong: `function isValid(s) {
  return s.length % 2 === 0
}
`,
    },
    python: {
      correct: `def is_valid(s):
    stack = []
    pairs = {')': '(', ']': '[', '}': '{'}
    for ch in s:
        if ch in '([{':
            stack.append(ch)
        elif not stack or stack.pop() != pairs[ch]:
            return False
    return len(stack) == 0
`,
      wrong: `def is_valid(s):
    return len(s) % 2 == 0
`,
    },
  },
  timeLimitMs: 2000,
  memoryLimitMb: 128,
  matchDurationSec: 600,
}

const BACKWARDS_WIZARD = {
  slug: 'backwards-wizard',
  title: 'The Backwards-Talking Wizard',
  description: `A wizard has cursed everyone in town to only speak in palindromes — strings that read the same forwards and backwards. But the wizard is sloppy: he ignores punctuation, spaces, and capital letters when checking.

Given a string \`s\`, return \`true\` if it's a palindrome considering only alphanumeric characters and ignoring case, otherwise \`false\`.

**Input format (stdin):**
- Line 1: the string as JSON (e.g. \`"A man, a plan, a canal: Panama"\`)

**Output format (stdout):**
- \`true\` or \`false\`

**Example 1**
\`\`\`
Input:
"A man, a plan, a canal: Panama"

Output:
true
\`\`\`

**Example 2**
\`\`\`
Input:
"race a car"

Output:
false
\`\`\`
`,
  difficulty: 'easy',
  category: 'two_pointers',
  tags: ['two-pointers', 'string'],
  starterCode: {
    javascript: `function isPalindrome(s) {
  // your solution here

}
`,
    python: `def is_palindrome(s):
    # your solution here
    pass
`,
  },
  harness: {
    javascript: `
const __s = JSON.parse(require('fs').readFileSync(0, 'utf8').trim())
console.log(JSON.stringify(isPalindrome(__s)))
`,
    python: `
import sys as __sys, json as __json
__s = __json.loads(__sys.stdin.read().strip())
print(__json.dumps(is_palindrome(__s)))
`,
  },
  testCases: [
    { input: '"A man, a plan, a canal: Panama"', expectedOutput: 'true' },
    { input: '"race a car"', expectedOutput: 'false' },
    { input: '" "', expectedOutput: 'true' },
    { input: '"racecar"', expectedOutput: 'true' },
    { input: '"hello"', expectedOutput: 'false' },
    { input: '"0P"', expectedOutput: 'false' },
  ],
  solutions: {
    javascript: {
      correct: `function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '')
  let i = 0, j = clean.length - 1
  while (i < j) {
    if (clean[i] !== clean[j]) return false
    i++; j--
  }
  return true
}
`,
      wrong: `function isPalindrome(s) {
  return s === s.split('').reverse().join('')
}
`,
    },
    python: {
      correct: `def is_palindrome(s):
    clean = ''.join(ch.lower() for ch in s if ch.isalnum())
    return clean == clean[::-1]
`,
      wrong: `def is_palindrome(s):
    return s == s[::-1]
`,
    },
  },
  timeLimitMs: 2000,
  memoryLimitMb: 128,
  matchDurationSec: 600,
}

const STONER_SQUIRREL = {
  slug: 'stoner-squirrel-stairs',
  title: 'Stoner Squirrel Stair Optimizer',
  description: `A squirrel high on fermented acorns is trying to climb a staircase with \`n\` steps. In its altered state, it can only leap **1 or 2 steps at a time**. How many distinct ways can it reach the top?

**Input format (stdin):**
- Line 1: the integer \`n\` (1 ≤ n ≤ 45)

**Output format (stdout):**
- The number of distinct paths

**Example 1**
\`\`\`
Input:
2

Output:
2
\`\`\`
(1+1, or 2)

**Example 2**
\`\`\`
Input:
3

Output:
3
\`\`\`
(1+1+1, 1+2, or 2+1)
`,
  difficulty: 'easy',
  category: 'dp',
  tags: ['dp', 'math'],
  starterCode: {
    javascript: `function climbStairs(n) {
  // your solution here

}
`,
    python: `def climb_stairs(n):
    # your solution here
    pass
`,
  },
  harness: {
    javascript: `
const __n = parseInt(require('fs').readFileSync(0, 'utf8').trim(), 10)
console.log(JSON.stringify(climbStairs(__n)))
`,
    python: `
import sys as __sys, json as __json
__n = int(__sys.stdin.read().strip())
print(__json.dumps(climb_stairs(__n)))
`,
  },
  testCases: [
    { input: '1', expectedOutput: '1' },
    { input: '2', expectedOutput: '2' },
    { input: '3', expectedOutput: '3' },
    { input: '4', expectedOutput: '5' },
    { input: '5', expectedOutput: '8' },
    { input: '10', expectedOutput: '89' },
    { input: '30', expectedOutput: '1346269' },
  ],
  solutions: {
    javascript: {
      correct: `function climbStairs(n) {
  let a = 1, b = 1
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b]
  }
  return b
}
`,
      wrong: `function climbStairs(n) {
  return n
}
`,
    },
    python: {
      correct: `def climb_stairs(n):
    a, b = 1, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
`,
      wrong: `def climb_stairs(n):
    return n
`,
    },
  },
  timeLimitMs: 2000,
  memoryLimitMb: 128,
  matchDurationSec: 600,
}

const INFLUENCER_STRETCH = {
  slug: 'influencer-k-day-stretch',
  title: "Influencer's Best K-Day Stretch",
  description: `An influencer's career is hanging by a thread. Their manager wants to know: across the last \`n\` days of like counts, what's the **highest sum of likes from any \`k\` consecutive days**? That's the clip they'll send to brand sponsors.

**Input format (stdin):**
- Line 1: the array of daily likes as JSON (e.g. \`[1,2,3,4,5]\`)
- Line 2: the integer \`k\` (1 ≤ k ≤ likes.length)

**Output format (stdout):**
- The maximum sum

**Example 1**
\`\`\`
Input:
[1,2,3,4,5]
2

Output:
9
\`\`\`

**Example 2**
\`\`\`
Input:
[10,1,1,1,10]
3

Output:
12
\`\`\`
`,
  difficulty: 'easy',
  category: 'sliding_window',
  tags: ['sliding-window', 'array'],
  starterCode: {
    javascript: `function maxKStretch(likes, k) {
  // your solution here

}
`,
    python: `def max_k_stretch(likes, k):
    # your solution here
    pass
`,
  },
  harness: {
    javascript: `
const __lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n')
const __likes = JSON.parse(__lines[0])
const __k = parseInt(__lines[1], 10)
console.log(JSON.stringify(maxKStretch(__likes, __k)))
`,
    python: `
import sys as __sys, json as __json
__lines = __sys.stdin.read().strip().split('\\n')
__likes = __json.loads(__lines[0])
__k = int(__lines[1])
print(__json.dumps(max_k_stretch(__likes, __k)))
`,
  },
  testCases: [
    { input: '[1,2,3,4,5]\n2', expectedOutput: '9' },
    { input: '[10,1,1,1,10]\n3', expectedOutput: '12' },
    { input: '[5]\n1', expectedOutput: '5' },
    { input: '[-1,-2,-3,-4]\n2', expectedOutput: '-3' },
    { input: '[4,3,2,1]\n4', expectedOutput: '10' },
    { input: '[2,1,5,1,3,2]\n3', expectedOutput: '9' },
  ],
  solutions: {
    javascript: {
      correct: `function maxKStretch(likes, k) {
  let sum = 0
  for (let i = 0; i < k; i++) sum += likes[i]
  let best = sum
  for (let i = k; i < likes.length; i++) {
    sum += likes[i] - likes[i - k]
    if (sum > best) best = sum
  }
  return best
}
`,
      wrong: `function maxKStretch(likes, k) {
  let s = 0
  for (let i = 0; i < k; i++) s += likes[i]
  return s
}
`,
    },
    python: {
      correct: `def max_k_stretch(likes, k):
    s = sum(likes[:k])
    best = s
    for i in range(k, len(likes)):
        s += likes[i] - likes[i - k]
        if s > best:
            best = s
    return best
`,
      wrong: `def max_k_stretch(likes, k):
    return sum(likes[:k])
`,
    },
  },
  timeLimitMs: 2000,
  memoryLimitMb: 128,
  matchDurationSec: 600,
}

const YEARBOOK_CRUSH = {
  slug: 'yearbook-crush',
  title: 'Find Your Crush in the Yearbook',
  description: `Your high-school yearbook is sorted by attractiveness rating, ascending. You're looking for one specific person — the rating of your crush. Return their **index** in the yearbook, or \`-1\` if they're not there.

The yearbook is sorted, so you should NOT scan it linearly. Embarrassing.

**Input format (stdin):**
- Line 1: the sorted array as JSON (e.g. \`[1,3,5,7,9]\`)
- Line 2: the target rating

**Output format (stdout):**
- The index, or \`-1\`

**Example 1**
\`\`\`
Input:
[1,3,5,7,9]
5

Output:
2
\`\`\`

**Example 2**
\`\`\`
Input:
[1,3,5,7,9]
4

Output:
-1
\`\`\`
`,
  difficulty: 'easy',
  category: 'binary_search',
  tags: ['binary-search', 'array'],
  starterCode: {
    javascript: `function findCrush(yearbook, target) {
  // your solution here

}
`,
    python: `def find_crush(yearbook, target):
    # your solution here
    pass
`,
  },
  harness: {
    javascript: `
const __lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n')
const __yb = JSON.parse(__lines[0])
const __target = parseInt(__lines[1], 10)
console.log(JSON.stringify(findCrush(__yb, __target)))
`,
    python: `
import sys as __sys, json as __json
__lines = __sys.stdin.read().strip().split('\\n')
__yb = __json.loads(__lines[0])
__target = int(__lines[1])
print(__json.dumps(find_crush(__yb, __target)))
`,
  },
  testCases: [
    { input: '[1,3,5,7,9]\n5', expectedOutput: '2' },
    { input: '[1,3,5,7,9]\n4', expectedOutput: '-1' },
    { input: '[1]\n1', expectedOutput: '0' },
    { input: '[1]\n2', expectedOutput: '-1' },
    { input: '[-5,-3,-1,0,2,4]\n0', expectedOutput: '3' },
    { input: '[1,2,3,4,5,6,7,8,9,10]\n10', expectedOutput: '9' },
    { input: '[1,2,3,4,5,6,7,8,9,10]\n1', expectedOutput: '0' },
  ],
  solutions: {
    javascript: {
      correct: `function findCrush(yearbook, target) {
  let lo = 0, hi = yearbook.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (yearbook[mid] === target) return mid
    if (yearbook[mid] < target) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}
`,
      wrong: `function findCrush(yearbook, target) {
  for (let i = 1; i < yearbook.length; i++) {
    if (yearbook[i] === target) return i
  }
  return -1
}
`,
    },
    python: {
      correct: `def find_crush(yearbook, target):
    lo, hi = 0, len(yearbook) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if yearbook[mid] == target:
            return mid
        if yearbook[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
`,
      wrong: `def find_crush(yearbook, target):
    for i in range(1, len(yearbook)):
        if yearbook[i] == target:
            return i
    return -1
`,
    },
  },
  timeLimitMs: 2000,
  memoryLimitMb: 128,
  matchDurationSec: 600,
}

const WITCH_ANAGRAM = {
  slug: 'witch-anagram',
  title: 'Did the Witch Just Rearrange My Spell?',
  description: `A witch has been sneaking into your spellbook and rearranging the letters of your incantations. Your job: given the original spell \`s\` and the suspicious new spell \`t\`, return \`true\` if \`t\` is just \`s\` with the letters rearranged (an anagram), \`false\` otherwise.

Comparison is **case-sensitive**. \`"abc"\` and \`"ABC"\` are NOT anagrams.

**Input format (stdin):**
- Line 1: the original spell as JSON (e.g. \`"anagram"\`)
- Line 2: the suspicious spell as JSON (e.g. \`"nagaram"\`)

**Output format (stdout):**
- \`true\` or \`false\`

**Example 1**
\`\`\`
Input:
"anagram"
"nagaram"

Output:
true
\`\`\`

**Example 2**
\`\`\`
Input:
"rat"
"car"

Output:
false
\`\`\`
`,
  difficulty: 'easy',
  category: 'arrays_hashing',
  tags: ['hash-map', 'string'],
  starterCode: {
    javascript: `function isAnagram(s, t) {
  // your solution here

}
`,
    python: `def is_anagram(s, t):
    # your solution here
    pass
`,
  },
  harness: {
    javascript: `
const __lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n')
const __s = JSON.parse(__lines[0])
const __t = JSON.parse(__lines[1])
console.log(JSON.stringify(isAnagram(__s, __t)))
`,
    python: `
import sys as __sys, json as __json
__lines = __sys.stdin.read().strip().split('\\n')
__s = __json.loads(__lines[0])
__t = __json.loads(__lines[1])
print(__json.dumps(is_anagram(__s, __t)))
`,
  },
  testCases: [
    { input: '"anagram"\n"nagaram"', expectedOutput: 'true' },
    { input: '"rat"\n"car"', expectedOutput: 'false' },
    { input: '""\n""', expectedOutput: 'true' },
    { input: '"ab"\n"a"', expectedOutput: 'false' },
    { input: '"ABC"\n"abc"', expectedOutput: 'false' },
    { input: '"listen"\n"silent"', expectedOutput: 'true' },
  ],
  solutions: {
    javascript: {
      correct: `function isAnagram(s, t) {
  if (s.length !== t.length) return false
  const counts = {}
  for (const c of s) counts[c] = (counts[c] || 0) + 1
  for (const c of t) {
    if (!counts[c]) return false
    counts[c]--
  }
  return true
}
`,
      wrong: `function isAnagram(s, t) {
  return s.length === t.length
}
`,
    },
    python: {
      correct: `def is_anagram(s, t):
    if len(s) != len(t):
        return False
    counts = {}
    for c in s:
        counts[c] = counts.get(c, 0) + 1
    for c in t:
        if not counts.get(c):
            return False
        counts[c] -= 1
    return True
`,
      wrong: `def is_anagram(s, t):
    return len(s) == len(t)
`,
    },
  },
  timeLimitMs: 2000,
  memoryLimitMb: 128,
  matchDurationSec: 600,
}

const DOGECOIN_CHEESE = {
  slug: 'dogecoin-cheese',
  title: "Dogecoin But It's Cheese",
  description: `Cheese futures! Given an array \`prices\` where \`prices[i]\` is the price of cheddar on day \`i\`, find the maximum profit you could make from **a single buy and a single sell**. You must buy before you sell. If no profit is possible, return \`0\`.

**Input format (stdin):**
- Line 1: the prices as a JSON array (e.g. \`[7,1,5,3,6,4]\`)

**Output format (stdout):**
- The maximum profit

**Example 1**
\`\`\`
Input:
[7,1,5,3,6,4]

Output:
5
\`\`\`
(buy at 1, sell at 6)

**Example 2**
\`\`\`
Input:
[7,6,4,3,1]

Output:
0
\`\`\`
(prices only fall — don't buy)
`,
  difficulty: 'easy',
  category: 'dp',
  tags: ['dp', 'array'],
  starterCode: {
    javascript: `function bestProfit(prices) {
  // your solution here

}
`,
    python: `def best_profit(prices):
    # your solution here
    pass
`,
  },
  harness: {
    javascript: `
const __prices = JSON.parse(require('fs').readFileSync(0, 'utf8').trim())
console.log(JSON.stringify(bestProfit(__prices)))
`,
    python: `
import sys as __sys, json as __json
__prices = __json.loads(__sys.stdin.read().strip())
print(__json.dumps(best_profit(__prices)))
`,
  },
  testCases: [
    { input: '[7,1,5,3,6,4]', expectedOutput: '5' },
    { input: '[7,6,4,3,1]', expectedOutput: '0' },
    { input: '[1,2,3,4,5]', expectedOutput: '4' },
    { input: '[2,4,1]', expectedOutput: '2' },
    { input: '[5]', expectedOutput: '0' },
    { input: '[3,3,3,3]', expectedOutput: '0' },
  ],
  solutions: {
    javascript: {
      correct: `function bestProfit(prices) {
  let minSeen = Infinity, best = 0
  for (const p of prices) {
    if (p < minSeen) minSeen = p
    else if (p - minSeen > best) best = p - minSeen
  }
  return best
}
`,
      wrong: `function bestProfit(prices) {
  return Math.max(...prices) - Math.min(...prices)
}
`,
    },
    python: {
      correct: `def best_profit(prices):
    min_seen = float('inf')
    best = 0
    for p in prices:
        if p < min_seen:
            min_seen = p
        elif p - min_seen > best:
            best = p - min_seen
    return best
`,
      wrong: `def best_profit(prices):
    return max(prices) - min(prices)
`,
    },
  },
  timeLimitMs: 2000,
  memoryLimitMb: 128,
  matchDurationSec: 600,
}

const MEDIAN_CONGA = {
  slug: 'median-conga',
  title: 'Find the Median Conga Dancer',
  description: `A conga line of dancers is represented as an array. Find the **middle dancer and everyone behind them** (i.e., the second half of the line, starting from the middle).

For an even-length line, the middle is the **second** of the two center dancers.

(Classic linked-list "find the middle node" problem, served via an array because everyone is sick of writing list parsers.)

**Input format (stdin):**
- Line 1: the line as a JSON array (e.g. \`[1,2,3,4,5]\`)

**Output format (stdout):**
- The middle-onwards portion as a JSON array

**Example 1**
\`\`\`
Input:
[1,2,3,4,5]

Output:
[3,4,5]
\`\`\`

**Example 2**
\`\`\`
Input:
[1,2,3,4,5,6]

Output:
[4,5,6]
\`\`\`
`,
  difficulty: 'easy',
  category: 'linked_list',
  tags: ['linked-list', 'two-pointers'],
  starterCode: {
    javascript: `function middleDancer(line) {
  // your solution here

}
`,
    python: `def middle_dancer(line):
    # your solution here
    pass
`,
  },
  harness: {
    javascript: `
const __line = JSON.parse(require('fs').readFileSync(0, 'utf8').trim())
console.log(JSON.stringify(middleDancer(__line)))
`,
    python: `
import sys as __sys, json as __json
__line = __json.loads(__sys.stdin.read().strip())
print(__json.dumps(middle_dancer(__line)))
`,
  },
  testCases: [
    { input: '[1,2,3,4,5]', expectedOutput: '[3,4,5]' },
    { input: '[1,2,3,4,5,6]', expectedOutput: '[4,5,6]' },
    { input: '[1]', expectedOutput: '[1]' },
    { input: '[1,2]', expectedOutput: '[2]' },
    { input: '[10,20,30,40,50,60,70]', expectedOutput: '[40,50,60,70]' },
  ],
  solutions: {
    javascript: {
      correct: `function middleDancer(line) {
  let slow = 0, fast = 0
  while (fast + 1 < line.length) {
    slow++
    fast += 2
  }
  return line.slice(slow)
}
`,
      wrong: `function middleDancer(line) {
  return line.slice(0, Math.floor(line.length / 2))
}
`,
    },
    python: {
      correct: `def middle_dancer(line):
    slow, fast = 0, 0
    while fast + 1 < len(line):
        slow += 1
        fast += 2
    return line[slow:]
`,
      wrong: `def middle_dancer(line):
    return line[: len(line) // 2]
`,
    },
  },
  timeLimitMs: 2000,
  memoryLimitMb: 128,
  matchDurationSec: 600,
}

const PROBLEMS = [
  TWO_SUM,
  WIZARD_SPELLBOOK,
  BACKWARDS_WIZARD,
  STONER_SQUIRREL,
  INFLUENCER_STRETCH,
  YEARBOOK_CRUSH,
  WITCH_ANAGRAM,
  DOGECOIN_CHEESE,
  MEDIAN_CONGA,
]

async function main() {
  for (const p of PROBLEMS) {
    const existing = await db.problem.findUnique({ where: { slug: p.slug } })
    if (existing) {
      console.log(`Problem "${p.slug}" exists (id: ${existing.id}), updating...`)
      await db.problem.update({ where: { id: existing.id }, data: p })
    } else {
      const created = await db.problem.create({ data: p })
      console.log(`Created problem "${p.slug}" (id: ${created.id})`)
    }
  }
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e)
    db.$disconnect()
    process.exit(1)
  })
