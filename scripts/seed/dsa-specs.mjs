/**
 * 48 data-structures-and-algorithms questions (16 Easy · 20 Medium · 12 Hard).
 * Each spec's `solve` is the reference solution — the seeder runs it over
 * `inputs` to produce the expected outputs, so test cases are correct by
 * construction. `solve` is serialised into the stored solution, so it must be
 * self-contained (no references to outer helpers).
 *
 * Contract: programs read stdin and print to stdout.
 */

const q = (title, category, difficulty, tags, statement, inputs, solve, hints, explanation) => ({
  title, category, difficulty, tags, statement, inputs, solve, hints, explanation,
});

export const DSA_SPECS = [
  /* ── Easy ──────────────────────────────────────────────────────── */
  q("Two Sum Indices", "Arrays & Hashing", "Easy", ["DSA", "Arrays", "Hash Map"],
    "Given an array of integers and a target, find two different positions whose values add up to the target. If several pairs work, choose the one with the smallest first index, then the smallest second index.\n\n**Input:** line 1 — space-separated integers; line 2 — the target.\n**Output:** the two indices `i j` (i < j, 0-based) separated by a space, or `-1` if no pair exists.",
    ["2 7 11 15\n9", "3 2 4\n6", "3 3\n6", "1 2 3\n100", "-1 -2 -3 -4 -5\n-8", "0 4 3 0\n0"],
    (input) => {
      const [l1, l2] = input.split("\n");
      const a = l1.trim().split(/\s+/).map(Number);
      const t = Number(l2);
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] + a[j] === t) return i + " " + j;
      return "-1";
    },
    ["Brute force checks every pair in O(n²).", "A hash map from value to index finds the partner in O(1).", "For each x, look up target - x among earlier elements."],
    "Scan once, storing each value's index in a map. For each element, the needed partner is `target - x`; if it is already in the map you have a pair in O(n) time."),

  q("Valid Parentheses", "Stack", "Easy", ["DSA", "Stack", "Strings"],
    "A string contains only the characters `()[]{}`. It is valid if every opening bracket is closed by the same type of bracket, in the correct order.\n\n**Input:** one string.\n**Output:** `true` if it is valid, otherwise `false`.",
    ["()", "()[]{}", "(]", "([)]", "{[]}", "((("],
    (input) => {
      const pairs = { ")": "(", "]": "[", "}": "{" };
      const stack = [];
      for (const ch of input.trim()) {
        if (pairs[ch]) { if (stack.pop() !== pairs[ch]) return "false"; }
        else stack.push(ch);
      }
      return String(stack.length === 0);
    },
    ["Push opening brackets on a stack.", "On a closing bracket, the top of the stack must be its match.", "The stack must be empty at the end."],
    "A stack mirrors the nesting: the most recent unmatched opener must be closed first. Any mismatch, or leftovers at the end, makes the string invalid."),

  q("Reverse Words", "Strings", "Easy", ["DSA", "Strings"],
    "Reverse the order of the words in a sentence. Words are separated by one or more spaces; the output uses exactly one space between words and no leading or trailing spaces.\n\n**Input:** one line of text.\n**Output:** the words in reverse order.",
    ["the sky is blue", "  hello   world  ", "a", "one two three four", "  leading and trailing  "],
    (input) => input.trim().split(/\s+/).reverse().join(" "),
    ["Split on whitespace, ignoring empty pieces.", "Reverse the array of words.", "Join with a single space."],
    "Splitting on `/\\s+/` after trimming removes extra spaces, then reversing and re-joining gives the answer in O(n)."),

  q("Valid Palindrome", "Two Pointers", "Easy", ["DSA", "Two Pointers", "Strings"],
    "A phrase is a palindrome if, after lowercasing it and removing every non-alphanumeric character, it reads the same forwards and backwards.\n\n**Input:** one line of text.\n**Output:** `true` or `false`.",
    ["A man, a plan, a canal: Panama", "race a car", "0P", "Was it a car or a cat I saw?", "ab_a"],
    (input) => {
      const s = input.toLowerCase().replace(/[^a-z0-9]/g, "");
      let i = 0, j = s.length - 1;
      while (i < j) { if (s[i++] !== s[j--]) return "false"; }
      return "true";
    },
    ["Normalise the string first.", "Compare characters from both ends moving inwards.", "Digits count as characters, punctuation does not."],
    "Clean the text, then use two pointers from the ends. The first mismatch proves it is not a palindrome."),

  q("Best Time to Buy and Sell Stock", "Greedy", "Easy", ["DSA", "Greedy", "Arrays"],
    "Given the price of a stock on each day, choose one day to buy and a later day to sell to maximise profit. If no profit is possible, the answer is 0.\n\n**Input:** one line of space-separated prices.\n**Output:** the maximum profit.",
    ["7 1 5 3 6 4", "7 6 4 3 1", "1 2", "5", "2 4 1 7"],
    (input) => {
      const p = input.trim().split(/\s+/).map(Number);
      let min = Infinity, best = 0;
      for (const x of p) { min = Math.min(min, x); best = Math.max(best, x - min); }
      return String(best);
    },
    ["You must buy before you sell.", "Track the lowest price seen so far.", "At each day, the best sale today is price - lowestSoFar."],
    "One pass keeping the minimum price so far; the best profit is the largest `price - min` seen. O(n) time, O(1) space."),

  q("Contains Duplicate", "Arrays & Hashing", "Easy", ["DSA", "Hash Set"],
    "Determine whether any value appears at least twice in the array.\n\n**Input:** one line of space-separated integers.\n**Output:** `true` if a duplicate exists, otherwise `false`.",
    ["1 2 3 1", "1 2 3 4", "1", "5 5", "9 8 7 6 5 4 3 2 1 9"],
    (input) => {
      const a = input.trim().split(/\s+/);
      return String(new Set(a.map(Number)).size !== a.length);
    },
    ["A Set stores unique values.", "Compare the set size with the array length.", "Or stop at the first value you have already seen."],
    "Insert values into a hash set; a repeat means a duplicate. O(n) time and space."),

  q("Missing Number", "Math & Bit Manipulation", "Easy", ["DSA", "Math"],
    "An array holds n distinct numbers taken from the range `0..n`, so exactly one number in that range is missing. Find it.\n\n**Input:** one line of space-separated integers.\n**Output:** the missing number.",
    ["3 0 1", "0 1", "9 6 4 2 3 5 7 0 1", "0", "1"],
    (input) => {
      const a = input.trim().split(/\s+/).map(Number);
      const n = a.length;
      return String((n * (n + 1)) / 2 - a.reduce((x, y) => x + y, 0));
    },
    ["The sum of 0..n is n(n+1)/2.", "Subtract the actual sum of the array.", "XOR of indices and values also works."],
    "The expected sum of `0..n` minus the actual sum leaves exactly the missing value."),

  q("Move Zeroes", "Two Pointers", "Easy", ["DSA", "Two Pointers", "Arrays"],
    "Move all zeros in the array to the end while keeping the relative order of the non-zero elements.\n\n**Input:** one line of space-separated integers.\n**Output:** the rearranged array, space-separated.",
    ["0 1 0 3 12", "0", "1 2 3", "0 0 1", "4 0 5 0 0 6"],
    (input) => {
      const a = input.trim().split(/\s+/).map(Number);
      let w = 0;
      for (let r = 0; r < a.length; r++) if (a[r] !== 0) a[w++] = a[r];
      while (w < a.length) a[w++] = 0;
      return a.join(" ");
    },
    ["Keep a write pointer for the next non-zero slot.", "Copy each non-zero value forward.", "Fill the rest with zeros."],
    "A single pass compacts non-zero values to the front in order; the remaining slots are filled with zeros. O(n) time, O(1) extra space."),

  q("Climbing Stairs", "Dynamic Programming", "Easy", ["DSA", "Dynamic Programming"],
    "You climb a staircase of n steps, taking 1 or 2 steps at a time. How many distinct ways are there to reach the top?\n\n**Input:** one integer n (1 ≤ n ≤ 45).\n**Output:** the number of ways.",
    ["2", "3", "1", "10", "45"],
    (input) => {
      const n = Number(input);
      let a = 1, b = 1;
      for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
      return String(b);
    },
    ["The last move is a 1-step or a 2-step.", "ways(n) = ways(n-1) + ways(n-2).", "You only need the previous two values."],
    "The count follows the Fibonacci recurrence. Keep two rolling values for O(n) time and O(1) space."),

  q("Binary Search Index", "Binary Search", "Easy", ["DSA", "Binary Search"],
    "Given a sorted array of distinct integers and a target, return the index of the target using binary search, or -1 if it is absent.\n\n**Input:** line 1 — sorted space-separated integers; line 2 — the target.\n**Output:** the 0-based index, or `-1`.",
    ["-1 0 3 5 9 12\n9", "-1 0 3 5 9 12\n2", "5\n5", "1 3 5 7\n7", "1 3 5 7\n1"],
    (input) => {
      const [l1, l2] = input.split("\n");
      const a = l1.trim().split(/\s+/).map(Number);
      const t = Number(l2);
      let lo = 0, hi = a.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (a[mid] === t) return String(mid);
        if (a[mid] < t) lo = mid + 1; else hi = mid - 1;
      }
      return "-1";
    },
    ["Keep a [lo, hi] window.", "Compare the middle element to the target.", "Discard the half that cannot contain it."],
    "Halve the search window each step by comparing the middle element — O(log n)."),

  q("Valid Anagram", "Strings", "Easy", ["DSA", "Strings", "Hash Map"],
    "Two strings are anagrams if one can be rearranged into the other using every letter exactly once.\n\n**Input:** two lines, each a lowercase string.\n**Output:** `true` or `false`.",
    ["anagram\nnagaram", "rat\ncar", "a\na", "listen\nsilent", "ab\na"],
    (input) => {
      const [a, b] = input.split("\n").map((s) => s.trim());
      if (a.length !== b.length) return "false";
      const count = {};
      for (const ch of a) count[ch] = (count[ch] || 0) + 1;
      for (const ch of b) { if (!count[ch]) return "false"; count[ch]--; }
      return "true";
    },
    ["Different lengths can never be anagrams.", "Count the letters of the first string.", "Decrement for the second; a missing count means false."],
    "Compare letter frequencies. A single counting pass is O(n)."),

  q("First Unique Character", "Strings", "Easy", ["DSA", "Strings", "Hash Map"],
    "Find the first character that appears exactly once in the string and return its index.\n\n**Input:** one lowercase string.\n**Output:** the 0-based index, or `-1` if every character repeats.",
    ["leetcode", "loveleetcode", "aabb", "z", "abcabcd"],
    (input) => {
      const s = input.trim();
      const count = {};
      for (const ch of s) count[ch] = (count[ch] || 0) + 1;
      for (let i = 0; i < s.length; i++) if (count[s[i]] === 1) return String(i);
      return "-1";
    },
    ["Count every character first.", "Then scan left to right.", "Return the first index whose count is 1."],
    "Two passes: build frequencies, then find the first character with frequency one."),

  q("Majority Element", "Arrays & Hashing", "Easy", ["DSA", "Arrays", "Voting"],
    "The majority element is the value that appears more than ⌊n/2⌋ times. The input always contains one. Find it.\n\n**Input:** one line of space-separated integers.\n**Output:** the majority element.",
    ["3 2 3", "2 2 1 1 1 2 2", "1", "5 5 5 1 2", "-1 -1 -1 2 3"],
    (input) => {
      const a = input.trim().split(/\s+/).map(Number);
      let cand = a[0], count = 0;
      for (const x of a) {
        if (count === 0) cand = x;
        count += x === cand ? 1 : -1;
      }
      return String(cand);
    },
    ["A frequency map works in O(n) space.", "Boyer–Moore voting needs O(1) space.", "Pairs of different elements cancel; the majority survives."],
    "Boyer–Moore voting: keep a candidate and a counter; matching values increment, others decrement. The majority element is guaranteed to remain."),

  q("Merge Sorted Arrays", "Two Pointers", "Easy", ["DSA", "Two Pointers", "Sorting"],
    "Merge two sorted arrays into one sorted array.\n\n**Input:** two lines, each a sorted list of space-separated integers.\n**Output:** the merged sorted array, space-separated.",
    ["1 3 5\n2 4 6", "1 2 3\n4 5 6", "5\n1", "-3 0 4\n-1 2", "1 1 1\n1 1"],
    (input) => {
      const [l1, l2] = input.split("\n");
      const a = l1.trim().split(/\s+/).map(Number);
      const b = l2.trim().split(/\s+/).map(Number);
      const out = [];
      let i = 0, j = 0;
      while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
      while (i < a.length) out.push(a[i++]);
      while (j < b.length) out.push(b[j++]);
      return out.join(" ");
    },
    ["Keep one pointer in each array.", "Take the smaller front element each time.", "Append whatever remains."],
    "The merge step of merge sort: two pointers, always take the smaller head. O(n + m)."),

  q("Roman to Integer", "Math & Bit Manipulation", "Easy", ["DSA", "Math", "Strings"],
    "Convert a Roman numeral (I=1, V=5, X=10, L=50, C=100, D=500, M=1000) to an integer. A smaller value before a larger one is subtracted (e.g. `IV` = 4).\n\n**Input:** one Roman numeral (1–3999).\n**Output:** its integer value.",
    ["III", "LVIII", "MCMXCIV", "IV", "IX", "MMMCMXCIX"],
    (input) => {
      const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      const s = input.trim();
      let total = 0;
      for (let i = 0; i < s.length; i++) {
        const cur = v[s[i]], next = v[s[i + 1]] || 0;
        total += cur < next ? -cur : cur;
      }
      return String(total);
    },
    ["Map each symbol to its value.", "If a symbol is smaller than the next one, subtract it.", "Otherwise add it."],
    "Scan left to right, subtracting a value when it precedes a larger one and adding otherwise."),

  q("Single Number", "Math & Bit Manipulation", "Easy", ["DSA", "Bit Manipulation"],
    "Every element appears twice except for one, which appears once. Find that single element.\n\n**Input:** one line of space-separated integers.\n**Output:** the element that appears once.",
    ["2 2 1", "4 1 2 1 2", "1", "-1 -1 -3", "7 3 5 3 5"],
    (input) => String(input.trim().split(/\s+/).map(Number).reduce((x, y) => x ^ y, 0)),
    ["x ^ x = 0 and x ^ 0 = x.", "XOR is commutative and associative.", "XOR the whole array together."],
    "XOR cancels equal pairs, leaving only the unique value — O(n) time, O(1) space."),

  /* ── Medium ────────────────────────────────────────────────────── */
  q("Maximum Subarray", "Dynamic Programming", "Medium", ["DSA", "Dynamic Programming", "Kadane"],
    "Find the contiguous, non-empty subarray with the largest sum and return that sum.\n\n**Input:** one line of space-separated integers.\n**Output:** the maximum subarray sum.",
    ["-2 1 -3 4 -1 2 1 -5 4", "1", "5 4 -1 7 8", "-3 -2 -1", "-2 -1", "8 -19 5 -4 20"],
    (input) => {
      const a = input.trim().split(/\s+/).map(Number);
      let cur = a[0], best = a[0];
      for (let i = 1; i < a.length; i++) {
        cur = Math.max(a[i], cur + a[i]);
        best = Math.max(best, cur);
      }
      return String(best);
    },
    ["Decide at each element: extend the run or start fresh.", "cur = max(x, cur + x).", "Track the best value seen."],
    "Kadane's algorithm: the best sum ending at each index is either the element alone or the previous best plus it. One pass, O(n)."),

  q("Longest Substring Without Repeating Characters", "Sliding Window", "Medium", ["DSA", "Sliding Window", "Strings"],
    "Find the length of the longest substring that contains no repeated characters.\n\n**Input:** one string (no spaces).\n**Output:** the length.",
    ["abcabcbb", "bbbbb", "pwwkew", "a", "dvdf", "abcdef", "tmmzuxt"],
    (input) => {
      const s = input.trim();
      const last = new Map();
      let start = 0, best = 0;
      for (let i = 0; i < s.length; i++) {
        if (last.has(s[i]) && last.get(s[i]) >= start) start = last.get(s[i]) + 1;
        last.set(s[i], i);
        best = Math.max(best, i - start + 1);
      }
      return String(best);
    },
    ["Keep a window [start, i] with unique characters.", "Remember the last index of each character.", "On a repeat inside the window, move start past it."],
    "A sliding window with a last-seen map grows to the right and jumps its left edge past any repeat. O(n)."),

  q("Product of Array Except Self", "Arrays & Hashing", "Medium", ["DSA", "Arrays", "Prefix Sums"],
    "Return an array where each element is the product of all the other elements. Do not use division.\n\n**Input:** one line of space-separated integers.\n**Output:** the resulting array, space-separated.",
    ["1 2 3 4", "-1 1 0 -3 3", "2 3", "1 1 1 1", "5 0 0"],
    (input) => {
      const a = input.trim().split(/\s+/).map(Number);
      const n = a.length;
      const out = new Array(n).fill(1);
      let left = 1;
      for (let i = 0; i < n; i++) { out[i] = left; left *= a[i]; }
      let right = 1;
      for (let i = n - 1; i >= 0; i--) { out[i] *= right; right *= a[i]; }
      return out.map((x) => (x === 0 ? 0 : x)).join(" ");
    },
    ["Result[i] = (product left of i) × (product right of i).", "Fill with prefix products first.", "Then multiply by suffix products in a backwards pass."],
    "Two passes build prefix and suffix products without division. O(n) time, O(1) extra space beyond the output."),

  q("Three Sum", "Two Pointers", "Medium", ["DSA", "Two Pointers", "Sorting"],
    "Find all unique triplets `a b c` in the array such that a + b + c = 0.\n\n**Input:** one line of space-separated integers.\n**Output:** each triplet on its own line with its values ascending; triplets ordered ascending (by first value, then second). Print `none` if there are no triplets.",
    ["-1 0 1 2 -1 -4", "0 1 1", "0 0 0", "-2 0 1 1 2", "3 -2 1 0 -1 2 -3"],
    (input) => {
      const a = input.trim().split(/\s+/).map(Number).sort((x, y) => x - y);
      const out = [];
      for (let i = 0; i < a.length - 2; i++) {
        if (i > 0 && a[i] === a[i - 1]) continue;
        let l = i + 1, r = a.length - 1;
        while (l < r) {
          const sum = a[i] + a[l] + a[r];
          if (sum < 0) l++;
          else if (sum > 0) r--;
          else {
            out.push(a[i] + " " + a[l] + " " + a[r]);
            l++; r--;
            while (l < r && a[l] === a[l - 1]) l++;
            while (l < r && a[r] === a[r + 1]) r--;
          }
        }
      }
      return out.length ? out.join("\n") : "none";
    },
    ["Sort first.", "Fix one value and use two pointers for the rest.", "Skip duplicates to keep triplets unique."],
    "Sort, fix the first number, and sweep two pointers inward. Skipping equal neighbours removes duplicate triplets. O(n²)."),

  q("Group Anagrams", "Arrays & Hashing", "Medium", ["DSA", "Hash Map", "Strings"],
    "Group the words that are anagrams of each other.\n\n**Input:** one line of space-separated lowercase words.\n**Output:** one group per line, words inside a group sorted alphabetically and separated by spaces; groups ordered alphabetically by their first word.",
    ["eat tea tan ate nat bat", "a", "abc bca cab xyz", "listen silent enlist google gogole", "ab ba ab"],
    (input) => {
      const words = input.trim().split(/\s+/);
      const groups = new Map();
      for (const w of words) {
        const key = w.split("").sort().join("");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(w);
      }
      const lines = [...groups.values()].map((g) => g.sort());
      lines.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
      return lines.map((g) => g.join(" ")).join("\n");
    },
    ["Anagrams share the same sorted letters.", "Use the sorted word as a hash-map key.", "Sort each group and the list of groups for stable output."],
    "Key every word by its sorted letters; words with the same key are anagrams. O(n · k log k) for words of length k."),

  q("Top K Frequent Elements", "Arrays & Hashing", "Medium", ["DSA", "Hash Map", "Sorting"],
    "Return the k most frequent values. Order them by frequency (highest first); break ties by the smaller value first.\n\n**Input:** line 1 — space-separated integers; line 2 — k.\n**Output:** the k values, space-separated.",
    ["1 1 1 2 2 3\n2", "1\n1", "4 4 5 5 6\n2", "3 3 2 2 1 1\n3", "5 -1 -1 2 2 2 5 5 5\n2"],
    (input) => {
      const [l1, l2] = input.split("\n");
      const a = l1.trim().split(/\s+/).map(Number);
      const k = Number(l2);
      const freq = new Map();
      for (const x of a) freq.set(x, (freq.get(x) || 0) + 1);
      return [...freq.entries()]
        .sort((p, q) => q[1] - p[1] || p[0] - q[0])
        .slice(0, k)
        .map((e) => e[0])
        .join(" ");
    },
    ["Count occurrences with a map.", "Sort entries by count descending, then value ascending.", "Take the first k."],
    "Frequency map plus a sort by (count desc, value asc). Bucket sort by frequency makes it O(n)."),

  q("Container With Most Water", "Two Pointers", "Medium", ["DSA", "Two Pointers", "Greedy"],
    "Each number is the height of a vertical line at that position. Choose two lines that, together with the x-axis, hold the most water. Area = distance between them × the shorter height.\n\n**Input:** one line of space-separated heights.\n**Output:** the maximum area.",
    ["1 8 6 2 5 4 8 3 7", "1 1", "4 3 2 1 4", "1 2 1", "2 3 4 5 18 17 6"],
    (input) => {
      const h = input.trim().split(/\s+/).map(Number);
      let l = 0, r = h.length - 1, best = 0;
      while (l < r) {
        best = Math.max(best, (r - l) * Math.min(h[l], h[r]));
        if (h[l] < h[r]) l++; else r--;
      }
      return String(best);
    },
    ["Start with the widest container.", "The shorter wall limits the area.", "Move the pointer at the shorter wall inward."],
    "Two pointers from both ends: moving the taller wall can never help, so always advance the shorter one. O(n)."),

  q("Rotate Array", "Arrays & Hashing", "Medium", ["DSA", "Arrays"],
    "Rotate the array to the right by k steps.\n\n**Input:** line 1 — space-separated integers; line 2 — k (k ≥ 0, may exceed the length).\n**Output:** the rotated array, space-separated.",
    ["1 2 3 4 5 6 7\n3", "-1 -100 3 99\n2", "1\n5", "1 2\n3", "1 2 3\n0"],
    (input) => {
      const [l1, l2] = input.split("\n");
      const a = l1.trim().split(/\s+/).map(Number);
      const k = Number(l2) % a.length;
      return [...a.slice(a.length - k), ...a.slice(0, a.length - k)].join(" ");
    },
    ["Rotating by n changes nothing — use k % n.", "The last k elements move to the front.", "Reversal tricks do it in place."],
    "Reduce k modulo the length, then the last k elements become the new prefix."),

  q("Search in Rotated Sorted Array", "Binary Search", "Medium", ["DSA", "Binary Search"],
    "A sorted array of distinct integers was rotated at an unknown pivot (e.g. `4 5 6 7 0 1 2`). Find the index of the target in O(log n).\n\n**Input:** line 1 — the rotated array; line 2 — the target.\n**Output:** the 0-based index, or `-1`.",
    ["4 5 6 7 0 1 2\n0", "4 5 6 7 0 1 2\n3", "1\n0", "1\n1", "5 1 3\n3", "3 4 5 1 2\n1"],
    (input) => {
      const [l1, l2] = input.split("\n");
      const a = l1.trim().split(/\s+/).map(Number);
      const t = Number(l2);
      let lo = 0, hi = a.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (a[mid] === t) return String(mid);
        if (a[lo] <= a[mid]) {
          if (a[lo] <= t && t < a[mid]) hi = mid - 1; else lo = mid + 1;
        } else if (a[mid] < t && t <= a[hi]) lo = mid + 1;
        else hi = mid - 1;
      }
      return "-1";
    },
    ["At least one half of the window is always sorted.", "Check whether the target lies inside the sorted half.", "Otherwise search the other half."],
    "Each step, one side of the midpoint is sorted. Test if the target falls in that range and narrow accordingly — O(log n)."),

  q("Number of Islands", "Graphs", "Medium", ["DSA", "Graphs", "DFS", "Matrix"],
    "A grid of `1` (land) and `0` (water) is given. An island is a group of land cells connected horizontally or vertically. Count the islands.\n\n**Input:** each line is one grid row (characters `0`/`1`, no spaces).\n**Output:** the number of islands.",
    ["11110\n11010\n11000\n00000", "11000\n11000\n00100\n00011", "1", "0", "101\n010\n101"],
    (input) => {
      const g = input.trim().split("\n").map((r) => r.trim().split(""));
      let count = 0;
      const dfs = (r, c) => {
        if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] !== "1") return;
        g[r][c] = "0";
        dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
      };
      for (let r = 0; r < g.length; r++)
        for (let c = 0; c < g[0].length; c++)
          if (g[r][c] === "1") { count++; dfs(r, c); }
      return String(count);
    },
    ["Scan every cell.", "When you find land, flood-fill the whole island.", "Mark visited cells so you never count them twice."],
    "Each unvisited land cell starts a new island; DFS marks everything connected to it. O(rows × cols)."),

  q("Coin Change", "Dynamic Programming", "Medium", ["DSA", "Dynamic Programming"],
    "Given coin denominations (unlimited supply of each) and an amount, find the fewest coins needed to make that amount.\n\n**Input:** line 1 — space-separated coin values; line 2 — the amount.\n**Output:** the minimum number of coins, or `-1` if it cannot be made.",
    ["1 2 5\n11", "2\n3", "1\n0", "186 419 83 408\n6249", "5 10\n7", "1 3 4\n6"],
    (input) => {
      const [l1, l2] = input.split("\n");
      const coins = l1.trim().split(/\s+/).map(Number);
      const amount = Number(l2);
      const dp = new Array(amount + 1).fill(Infinity);
      dp[0] = 0;
      for (let a = 1; a <= amount; a++)
        for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
      return String(dp[amount] === Infinity ? -1 : dp[amount]);
    },
    ["Greedy fails for coins like 1, 3, 4.", "dp[a] = fewest coins for amount a.", "dp[a] = min over coins of dp[a - coin] + 1."],
    "Bottom-up DP over amounts: each amount takes the best of using one more coin of each denomination. O(amount × coins)."),

  q("Longest Increasing Subsequence", "Dynamic Programming", "Medium", ["DSA", "Dynamic Programming", "Binary Search"],
    "Find the length of the longest strictly increasing subsequence (elements need not be contiguous).\n\n**Input:** one line of space-separated integers.\n**Output:** the length.",
    ["10 9 2 5 3 7 101 18", "0 1 0 3 2 3", "7 7 7 7", "1", "4 10 4 3 8 9"],
    (input) => {
      const a = input.trim().split(/\s+/).map(Number);
      const tails = [];
      for (const x of a) {
        let lo = 0, hi = tails.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (tails[mid] < x) lo = mid + 1; else hi = mid;
        }
        tails[lo] = x;
      }
      return String(tails.length);
    },
    ["O(n²) DP: best ending at i from all smaller earlier values.", "Patience sorting keeps the smallest tail for each length.", "Binary-search where each value belongs in the tails array."],
    "Maintain `tails[k]` = smallest tail of an increasing subsequence of length k+1; binary search each value's slot for O(n log n)."),

  q("Merge Intervals", "Intervals", "Medium", ["DSA", "Intervals", "Sorting"],
    "Merge all overlapping intervals. Intervals that merely touch (e.g. `1 4` and `4 5`) also merge.\n\n**Input:** each line is one interval `start end`.\n**Output:** the merged intervals, one `start end` per line, sorted by start.",
    ["1 3\n2 6\n8 10\n15 18", "1 4\n4 5", "1 4\n0 4", "5 6", "1 10\n2 3\n4 5", "6 8\n1 9\n2 4\n4 7"],
    (input) => {
      const iv = input.trim().split("\n").map((l) => l.trim().split(/\s+/).map(Number)).sort((a, b) => a[0] - b[0]);
      const out = [iv[0].slice()];
      for (let i = 1; i < iv.length; i++) {
        const last = out[out.length - 1];
        if (iv[i][0] <= last[1]) last[1] = Math.max(last[1], iv[i][1]);
        else out.push(iv[i].slice());
      }
      return out.map((p) => p.join(" ")).join("\n");
    },
    ["Sort by start time.", "Compare each interval with the last merged one.", "Overlap if start ≤ last end; extend the end with max."],
    "After sorting by start, a single sweep either extends the last merged interval or begins a new one. O(n log n)."),

  q("Daily Temperatures", "Stack", "Medium", ["DSA", "Stack", "Monotonic Stack"],
    "For each day, find how many days you must wait for a warmer temperature. Use 0 if there is no warmer day ahead.\n\n**Input:** one line of space-separated temperatures.\n**Output:** the wait for each day, space-separated.",
    ["73 74 75 71 69 72 76 73", "30 40 50 60", "30 60 90", "90", "50 40 30"],
    (input) => {
      const t = input.trim().split(/\s+/).map(Number);
      const res = new Array(t.length).fill(0);
      const stack = [];
      for (let i = 0; i < t.length; i++) {
        while (stack.length && t[stack[stack.length - 1]] < t[i]) {
          const j = stack.pop();
          res[j] = i - j;
        }
        stack.push(i);
      }
      return res.join(" ");
    },
    ["Keep a stack of days still waiting for a warmer one.", "A warmer day resolves every colder day on top of the stack.", "The answer is the index difference."],
    "A monotonic decreasing stack of indices resolves each day exactly once, giving O(n)."),

  q("Subarray Sum Equals K", "Arrays & Hashing", "Medium", ["DSA", "Prefix Sums", "Hash Map"],
    "Count the contiguous subarrays whose sum equals k. Values may be negative.\n\n**Input:** line 1 — space-separated integers; line 2 — k.\n**Output:** the number of such subarrays.",
    ["1 1 1\n2", "1 2 3\n3", "1\n0", "-1 -1 1\n0", "3 4 7 2 -3 1 4 2\n7"],
    (input) => {
      const [l1, l2] = input.split("\n");
      const a = l1.trim().split(/\s+/).map(Number);
      const k = Number(l2);
      const seen = new Map([[0, 1]]);
      let sum = 0, count = 0;
      for (const x of a) {
        sum += x;
        count += seen.get(sum - k) || 0;
        seen.set(sum, (seen.get(sum) || 0) + 1);
      }
      return String(count);
    },
    ["A subarray sum is a difference of two prefix sums.", "You need earlier prefix = current prefix - k.", "Store prefix-sum frequencies in a map."],
    "Count how many earlier prefix sums equal `prefix - k`. With negatives, sliding windows fail but the hash map works in O(n)."),

  q("Longest Palindromic Substring", "Strings", "Medium", ["DSA", "Strings", "Two Pointers"],
    "Find the longest palindromic substring. If several have the same length, return the leftmost one.\n\n**Input:** one string (no spaces).\n**Output:** the substring.",
    ["babad", "cbbd", "a", "forgeeksskeegfor", "abc", "racecar"],
    (input) => {
      const s = input.trim();
      let bestStart = 0, bestLen = 1;
      const expand = (l, r) => {
        while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
        const len = r - l - 1;
        if (len > bestLen) { bestLen = len; bestStart = l + 1; }
      };
      for (let i = 0; i < s.length; i++) { expand(i, i); expand(i, i + 1); }
      return s.slice(bestStart, bestStart + bestLen);
    },
    ["Every palindrome has a centre.", "Expand outwards from each centre (odd and even).", "Keep the longest; strict > keeps the leftmost on ties."],
    "Expand around each of the 2n−1 centres, tracking the best range. O(n²) time, O(1) space."),

  q("Word Break", "Dynamic Programming", "Medium", ["DSA", "Dynamic Programming", "Strings"],
    "Can the string be split into a sequence of words from the dictionary? Words may be reused.\n\n**Input:** line 1 — the string; line 2 — space-separated dictionary words.\n**Output:** `true` or `false`.",
    ["leetcode\nleet code", "applepenapple\napple pen", "catsandog\ncats dog sand and cat", "a\nb", "aaaaaaa\naaaa aaa"],
    (input) => {
      const [l1, l2] = input.split("\n");
      const s = l1.trim();
      const dict = new Set(l2.trim().split(/\s+/));
      const dp = new Array(s.length + 1).fill(false);
      dp[0] = true;
      for (let i = 1; i <= s.length; i++)
        for (let j = 0; j < i; j++)
          if (dp[j] && dict.has(s.slice(j, i))) { dp[i] = true; break; }
      return String(dp[s.length]);
    },
    ["dp[i] = can the first i characters be segmented?", "Try every split point j < i.", "dp[i] is true if dp[j] is true and s[j..i) is a word."],
    "Prefix DP: a prefix is segmentable when some shorter segmentable prefix is followed by a dictionary word."),

  q("Decode Ways", "Dynamic Programming", "Medium", ["DSA", "Dynamic Programming", "Strings"],
    "A message of digits is decoded using `1→A, 2→B, …, 26→Z`. Count how many different ways the digit string can be decoded. Leading zeros are invalid.\n\n**Input:** one digit string.\n**Output:** the number of decodings.",
    ["12", "226", "06", "10", "2101", "111111"],
    (input) => {
      const s = input.trim();
      const n = s.length;
      const dp = new Array(n + 1).fill(0);
      dp[0] = 1;
      dp[1] = s[0] === "0" ? 0 : 1;
      for (let i = 2; i <= n; i++) {
        if (s[i - 1] !== "0") dp[i] += dp[i - 1];
        const two = Number(s.slice(i - 2, i));
        if (two >= 10 && two <= 26) dp[i] += dp[i - 2];
      }
      return String(dp[n]);
    },
    ["Each position can be a 1-digit or 2-digit code.", "'0' alone is invalid; '10' and '20' are valid pairs.", "Combine dp[i-1] and dp[i-2] when allowed."],
    "Like climbing stairs with validity checks: add `dp[i-1]` for a valid single digit and `dp[i-2]` for a valid pair 10–26."),

  q("Course Schedule", "Graphs", "Medium", ["DSA", "Graphs", "Topological Sort"],
    "There are n courses numbered `0..n-1`. Each prerequisite `a b` means you must take course b before course a. Can you finish all courses?\n\n**Input:** line 1 — `n m` (courses, prerequisite pairs); then m lines each `a b`.\n**Output:** `true` if all courses can be finished, otherwise `false`.",
    ["2 1\n1 0", "2 2\n1 0\n0 1", "4 3\n1 0\n2 1\n3 2", "1 0", "3 3\n0 1\n1 2\n2 0"],
    (input) => {
      const lines = input.trim().split("\n");
      const [n, m] = lines[0].trim().split(/\s+/).map(Number);
      const adj = Array.from({ length: n }, () => []);
      const indeg = new Array(n).fill(0);
      for (let i = 1; i <= m; i++) {
        const [a, b] = lines[i].trim().split(/\s+/).map(Number);
        adj[b].push(a);
        indeg[a]++;
      }
      const queue = [];
      for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
      let done = 0;
      while (queue.length) {
        const u = queue.shift();
        done++;
        for (const v of adj[u]) if (--indeg[v] === 0) queue.push(v);
      }
      return String(done === n);
    },
    ["It is possible exactly when the graph has no cycle.", "Kahn's algorithm: repeatedly remove nodes with no prerequisites.", "If every node gets removed, there is no cycle."],
    "Topological sort via in-degrees: if all n courses can be dequeued the dependency graph is acyclic."),

  q("Jump Game", "Greedy", "Medium", ["DSA", "Greedy", "Arrays"],
    "Each number is the maximum jump length from that position. Starting at index 0, can you reach the last index?\n\n**Input:** one line of space-separated non-negative integers.\n**Output:** `true` or `false`.",
    ["2 3 1 1 4", "3 2 1 0 4", "0", "1 0", "0 1", "2 0 0"],
    (input) => {
      const a = input.trim().split(/\s+/).map(Number);
      let reach = 0;
      for (let i = 0; i < a.length; i++) {
        if (i > reach) return "false";
        reach = Math.max(reach, i + a[i]);
      }
      return "true";
    },
    ["Track the farthest index reachable so far.", "If you land beyond that range, you are stuck.", "Update reach with i + a[i] at every step."],
    "Greedy: maintain the furthest reachable index; if the scan passes it, the end is unreachable. O(n)."),

  /* ── Hard ──────────────────────────────────────────────────────── */
  q("Trapping Rain Water", "Two Pointers", "Hard", ["DSA", "Two Pointers", "Stack"],
    "Each number is the height of a bar of width 1. After raining, how much water is trapped between the bars?\n\n**Input:** one line of space-separated heights.\n**Output:** the units of trapped water.",
    ["0 1 0 2 1 0 1 3 2 1 2 1", "4 2 0 3 2 5", "1", "3 0 3", "5 4 1 2", "2 0 2"],
    (input) => {
      const h = input.trim().split(/\s+/).map(Number);
      let l = 0, r = h.length - 1, leftMax = 0, rightMax = 0, water = 0;
      while (l < r) {
        if (h[l] < h[r]) {
          leftMax = Math.max(leftMax, h[l]);
          water += leftMax - h[l++];
        } else {
          rightMax = Math.max(rightMax, h[r]);
          water += rightMax - h[r--];
        }
      }
      return String(water);
    },
    ["Water above a bar = min(maxLeft, maxRight) - height.", "Prefix and suffix max arrays give O(n) space.", "Two pointers: process the side with the smaller wall."],
    "The water above each bar is limited by the lower of the tallest bars on its left and right. Two pointers track both maxima in O(1) space."),

  q("Longest Valid Parentheses", "Stack", "Hard", ["DSA", "Stack", "Dynamic Programming"],
    "Given a string of `(` and `)`, find the length of the longest valid (well-formed) parentheses substring.\n\n**Input:** one string of parentheses.\n**Output:** the length.",
    ["(()", ")()())", "()(()", "()(())", "(((", "()"],
    (input) => {
      const s = input.trim();
      const stack = [-1];
      let best = 0;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === "(") stack.push(i);
        else {
          stack.pop();
          if (!stack.length) stack.push(i);
          else best = Math.max(best, i - stack[stack.length - 1]);
        }
      }
      return String(best);
    },
    ["Store indices on a stack, seeded with -1.", "Pop on ')'; if the stack empties push the current index as a new base.", "Length = i - stack top."],
    "A stack of indices marks the last unmatched position; each matched ')' measures the run back to that marker. O(n)."),

  q("Edit Distance", "Dynamic Programming", "Hard", ["DSA", "Dynamic Programming", "Strings"],
    "Find the minimum number of operations to convert one word into another. Allowed operations: insert a character, delete a character, replace a character.\n\n**Input:** two lines — the source word and the target word.\n**Output:** the minimum number of operations.",
    ["horse\nros", "intention\nexecution", "a\na", "abc\nyabd", "sunday\nsaturday", "kitten\nsitting"],
    (input) => {
      const [a, b] = input.split("\n").map((s) => s.trim());
      const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
      for (let j = 0; j <= b.length; j++) dp[0][j] = j;
      for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++)
          dp[i][j] = a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      return String(dp[a.length][b.length]);
    },
    ["dp[i][j] = cost to turn a[0..i) into b[0..j).", "If the last characters match, no extra cost.", "Otherwise 1 + min(delete, insert, replace)."],
    "Classic Levenshtein DP over prefixes of both words. O(n × m) time."),

  q("Median of Two Sorted Arrays", "Binary Search", "Hard", ["DSA", "Binary Search", "Arrays"],
    "Find the median of two sorted arrays combined. If the total count is even, the median is the average of the two middle values.\n\n**Input:** two lines, each a sorted list of space-separated integers.\n**Output:** the median with exactly one decimal place (e.g. `2.5`, `3.0`).",
    ["1 3\n2", "1 2\n3 4", "0 0\n0 0", "1\n1", "2\n1 3 4 5"],
    (input) => {
      const [l1, l2] = input.split("\n");
      const a = l1.trim().split(/\s+/).map(Number);
      const b = l2.trim().split(/\s+/).map(Number);
      const m = [];
      let i = 0, j = 0;
      while (i < a.length || j < b.length) {
        if (j >= b.length || (i < a.length && a[i] <= b[j])) m.push(a[i++]);
        else m.push(b[j++]);
      }
      const n = m.length;
      const med = n % 2 ? m[(n - 1) / 2] : (m[n / 2 - 1] + m[n / 2]) / 2;
      return med.toFixed(1);
    },
    ["Merging then picking the middle is O(n + m).", "The O(log(min(n, m))) solution binary-searches a partition.", "The correct partition has every left value ≤ every right value."],
    "Merging is enough to pass, and the asymptotically optimal approach binary-searches the partition point of the shorter array."),

  q("Sliding Window Maximum", "Sliding Window", "Hard", ["DSA", "Sliding Window", "Deque"],
    "A window of size k slides from the left to the right of the array one position at a time. Report the maximum of each window.\n\n**Input:** line 1 — space-separated integers; line 2 — k (1 ≤ k ≤ length).\n**Output:** the maximum of every window, space-separated.",
    ["1 3 -1 -3 5 3 6 7\n3", "1\n1", "9 11\n2", "4 3 2 1\n2", "1 -1\n1", "7 2 4\n2"],
    (input) => {
      const [l1, l2] = input.split("\n");
      const a = l1.trim().split(/\s+/).map(Number);
      const k = Number(l2);
      const dq = [];
      const out = [];
      for (let i = 0; i < a.length; i++) {
        while (dq.length && dq[0] <= i - k) dq.shift();
        while (dq.length && a[dq[dq.length - 1]] <= a[i]) dq.pop();
        dq.push(i);
        if (i >= k - 1) out.push(a[dq[0]]);
      }
      return out.join(" ");
    },
    ["Recomputing the max each window is O(n·k).", "Keep a deque of indices with decreasing values.", "The front of the deque is always the window maximum."],
    "A monotonic deque discards smaller elements that can never be a future maximum; each index enters and leaves once, so O(n)."),

  q("Largest Rectangle in Histogram", "Stack", "Hard", ["DSA", "Stack", "Monotonic Stack"],
    "Each number is the height of a histogram bar of width 1. Find the area of the largest rectangle that fits inside the histogram.\n\n**Input:** one line of space-separated heights.\n**Output:** the largest area.",
    ["2 1 5 6 2 3", "2 4", "1", "6 2 5 4 5 1 6", "0 0 0", "2 1 2"],
    (input) => {
      const h = input.trim().split(/\s+/).map(Number);
      h.push(0);
      const stack = [];
      let best = 0;
      for (let i = 0; i < h.length; i++) {
        while (stack.length && h[stack[stack.length - 1]] >= h[i]) {
          const height = h[stack.pop()];
          const left = stack.length ? stack[stack.length - 1] : -1;
          best = Math.max(best, height * (i - left - 1));
        }
        stack.push(i);
      }
      return String(best);
    },
    ["For each bar, find how far it can extend left and right.", "A monotonic increasing stack gives those boundaries.", "A sentinel 0 at the end flushes the stack."],
    "When a shorter bar arrives, every taller bar on the stack has found its right boundary; the new stack top is its left boundary. O(n)."),

  q("N-Queens Count", "Backtracking", "Hard", ["DSA", "Backtracking"],
    "Place n queens on an n × n chessboard so that no two queens attack each other (same row, column or diagonal). Count the distinct solutions.\n\n**Input:** one integer n (1 ≤ n ≤ 9).\n**Output:** the number of solutions.",
    ["1", "4", "5", "6", "8", "9"],
    (input) => {
      const n = Number(input);
      const cols = new Set(), d1 = new Set(), d2 = new Set();
      const place = (r) => {
        if (r === n) return 1;
        let total = 0;
        for (let c = 0; c < n; c++) {
          if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue;
          cols.add(c); d1.add(r - c); d2.add(r + c);
          total += place(r + 1);
          cols.delete(c); d1.delete(r - c); d2.delete(r + c);
        }
        return total;
      };
      return String(place(0));
    },
    ["Place one queen per row.", "Track used columns and both diagonals (r-c and r+c).", "Backtrack after exploring each placement."],
    "Row-by-row backtracking with constant-time conflict checks via sets of columns and diagonals."),

  q("Minimum Window Substring", "Sliding Window", "Hard", ["DSA", "Sliding Window", "Hash Map"],
    "Find the smallest substring of s that contains every character of t (with multiplicity). If several windows have the same length, return the leftmost.\n\n**Input:** line 1 — s; line 2 — t.\n**Output:** the window, or `NONE` if no window exists.",
    ["ADOBECODEBANC\nABC", "a\na", "a\naa", "ab\nb", "aaflslflsldkalskaaa\naaa"],
    (input) => {
      const [s, t] = input.split("\n").map((x) => x.trim());
      const need = {};
      for (const ch of t) need[ch] = (need[ch] || 0) + 1;
      let missing = t.length, left = 0, bestStart = 0, bestLen = Infinity;
      for (let right = 0; right < s.length; right++) {
        if (need[s[right]] !== undefined) { if (need[s[right]] > 0) missing--; need[s[right]]--; }
        while (missing === 0) {
          if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestStart = left; }
          const ch = s[left++];
          if (need[ch] !== undefined) { need[ch]++; if (need[ch] > 0) missing++; }
        }
      }
      return bestLen === Infinity ? "NONE" : s.slice(bestStart, bestStart + bestLen);
    },
    ["Count how many of each needed character you still lack.", "Expand the right edge until the window is valid.", "Then shrink from the left while it stays valid, recording the best."],
    "Two pointers with a 'missing' counter: grow until valid, shrink while valid, keep the shortest. O(|s| + |t|)."),

  q("Word Ladder Length", "Graphs", "Hard", ["DSA", "Graphs", "BFS"],
    "Transform a begin word into an end word by changing one letter at a time; every intermediate word must be in the word list (the end word must be in it too). Return the number of words in the shortest transformation sequence, counting both ends.\n\n**Input:** line 1 — `begin end`; line 2 — space-separated word list.\n**Output:** the length of the shortest sequence, or `0` if none exists.",
    ["hit cog\nhot dot dog lot log cog", "hit cog\nhot dot dog lot log", "a c\na b c", "hot dog\ndog", "red tax\nted tex red tax tad den rex pee"],
    (input) => {
      const [l1, l2] = input.split("\n");
      const [begin, end] = l1.trim().split(/\s+/);
      const words = new Set(l2.trim().split(/\s+/));
      if (!words.has(end)) return "0";
      const queue = [[begin, 1]];
      const seen = new Set([begin]);
      while (queue.length) {
        const [word, dist] = queue.shift();
        if (word === end) return String(dist);
        for (let i = 0; i < word.length; i++) {
          for (let c = 97; c <= 122; c++) {
            const next = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);
            if (words.has(next) && !seen.has(next)) { seen.add(next); queue.push([next, dist + 1]); }
          }
        }
      }
      return "0";
    },
    ["Words are nodes; one-letter differences are edges.", "BFS finds the shortest path in an unweighted graph.", "Generate neighbours by trying all 26 letters per position."],
    "BFS from the begin word, generating neighbours by single-letter substitution and checking the dictionary. Distance counts words, not edges."),

  q("Regular Expression Matching", "Dynamic Programming", "Hard", ["DSA", "Dynamic Programming", "Strings"],
    "Implement matching of a string against a pattern supporting `.` (any single character) and `*` (zero or more of the preceding element). The match must cover the entire string.\n\n**Input:** line 1 — the string s; line 2 — the pattern p (a `*` always follows a letter or `.`).\n**Output:** `true` or `false`.",
    ["aa\na", "aa\na*", "ab\n.*", "aab\nc*a*b", "mississippi\nmis*is*p*.", "a\nab*", "ab\n.*c"],
    (input) => {
      const [s, p] = input.split("\n").map((x) => x.trim());
      const dp = Array.from({ length: s.length + 1 }, () => new Array(p.length + 1).fill(false));
      dp[0][0] = true;
      for (let j = 2; j <= p.length; j++) if (p[j - 1] === "*") dp[0][j] = dp[0][j - 2];
      for (let i = 1; i <= s.length; i++) {
        for (let j = 1; j <= p.length; j++) {
          if (p[j - 1] === "*") {
            dp[i][j] = dp[i][j - 2] || ((p[j - 2] === "." || p[j - 2] === s[i - 1]) && dp[i - 1][j]);
          } else {
            dp[i][j] = (p[j - 1] === "." || p[j - 1] === s[i - 1]) && dp[i - 1][j - 1];
          }
        }
      }
      return String(dp[s.length][p.length]);
    },
    ["dp[i][j]: does s[0..i) match p[0..j)?", "For '*', either use zero copies (dp[i][j-2]) or consume one character.", "'.' matches any single character."],
    "A 2-D DP over prefixes. For `x*` you may drop the pair or let it absorb one more character of s."),

  q("Burst Balloons", "Dynamic Programming", "Hard", ["DSA", "Dynamic Programming", "Intervals"],
    "You have balloons with numbers. Bursting balloon i earns `nums[i-1] × nums[i] × nums[i+1]` coins (a missing neighbour counts as 1). After a burst its neighbours become adjacent. Find the maximum coins you can collect by bursting all balloons.\n\n**Input:** one line of space-separated integers.\n**Output:** the maximum coins.",
    ["3 1 5 8", "1 5", "7", "9 76 64 21", "3 1 5"],
    (input) => {
      const a = [1, ...input.trim().split(/\s+/).map(Number), 1];
      const n = a.length;
      const dp = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let len = 2; len < n; len++) {
        for (let l = 0; l + len < n; l++) {
          const r = l + len;
          for (let k = l + 1; k < r; k++) {
            dp[l][r] = Math.max(dp[l][r], dp[l][k] + dp[k][r] + a[l] * a[k] * a[r]);
          }
        }
      }
      return String(dp[0][n - 1]);
    },
    ["Think about the LAST balloon to burst in a range.", "If k is last in (l, r), its neighbours are the fixed ends l and r.", "dp[l][r] = max over k of dp[l][k] + dp[k][r] + a[l]·a[k]·a[r]."],
    "Interval DP on the last balloon burst: it splits the range into two independent subproblems. O(n³)."),

  q("Shortest Path (Dijkstra)", "Graphs", "Hard", ["DSA", "Graphs", "Dijkstra"],
    "Given a directed graph with non-negative edge weights, find the shortest distance from a source to a destination.\n\n**Input:** line 1 — `n m` (nodes 0..n-1, edge count); next m lines — `u v w` (edge u→v with weight w); last line — `source destination`.\n**Output:** the shortest distance, or `-1` if the destination is unreachable.",
    ["5 6\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 3 5\n3 4 3\n0 4", "3 1\n0 1 5\n0 2", "2 1\n0 1 3\n0 1", "1 0\n0 0", "4 4\n0 1 1\n1 2 1\n2 3 1\n0 3 10\n0 3"],
    (input) => {
      const lines = input.trim().split("\n");
      const [n, m] = lines[0].trim().split(/\s+/).map(Number);
      const adj = Array.from({ length: n }, () => []);
      for (let i = 1; i <= m; i++) {
        const [u, v, w] = lines[i].trim().split(/\s+/).map(Number);
        adj[u].push([v, w]);
      }
      const [s, t] = lines[m + 1].trim().split(/\s+/).map(Number);
      const dist = new Array(n).fill(Infinity);
      const done = new Array(n).fill(false);
      dist[s] = 0;
      for (let iter = 0; iter < n; iter++) {
        let u = -1;
        for (let i = 0; i < n; i++) if (!done[i] && (u === -1 || dist[i] < dist[u])) u = i;
        if (u === -1 || dist[u] === Infinity) break;
        done[u] = true;
        for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
      }
      return String(dist[t] === Infinity ? -1 : dist[t]);
    },
    ["Keep the best known distance to every node.", "Repeatedly settle the unvisited node with the smallest distance.", "Relax its outgoing edges."],
    "Dijkstra's algorithm: always settle the closest unsettled node; with non-negative weights its distance is final. A priority queue makes it O((n+m) log n)."),
];
