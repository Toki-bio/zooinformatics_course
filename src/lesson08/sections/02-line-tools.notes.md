# s02 Line tools: notes

## Sources opened (exact supporting text kept)
- GNU grep manual, https://www.gnu.org/software/grep/manual/grep.html (fetched 2026-11-05; local grep on the test machine was 3.0, so the manual is newer than the binary).
  - "there is no way to match newline characters in a text" (Usage: newline separates patterns).
  - "egrep and fgrep were deemed obsolescent by POSIX in 1992, removed from POSIX in 2001, deprecated by GNU Grep 2.5.3 in 2007, and changed to issue obsolescence warnings by GNU Grep 3.8 in 2022; eventually, they are planned to be removed entirely."
  - "To obtain the traditional interpretation of bracket expressions, you can use the 'C' locale by setting the LC_ALL environment variable to the value 'C'." The manual says nothing about speed: the page does not claim LC_ALL=C is faster.
  - "The empty regular expression matches the empty string."
  - -F: "Interpret patterns as fixed strings, not regular expressions."
- ripgrep GUIDE.md (master, fetched 2026-11-05; ripgrep 14.1.1 run locally): binary = "any file with a NUL byte"; "-z/--search-zip: Search compressed files ... This is disabled by default."; "-c/--count: Report a count of total matched lines."; "-U/--multiline: Permit matches to span multiple lines."
- seqkit v2.14.0 (latest release at fetch time): usage page https://bioinf.shenwei.me/seqkit/usage/ and source seqkit/cmd/grep.go. Help text: "Both positive and negative strand are searched ... switch on -P/--only-positive-strand"; "Only substitutions are allowed; insertions and deletions are not."; single pattern up to 64 characters with 1-4 mismatches uses an optimized search; "For large genomes like human genome, using mapping/alignment tools would be faster". Reads gzip directly (usage page). NOT RUN: seqkit is not installed on the test machine.
- TRE agrep man page (doc/agrep.1.in in https://github.com/laurikari/tre): "Searches for approximate matches of PATTERN in each FILE"; example "agrep -2 optimize foo.txt"; options -D -I -S costs, -E/--max-errors, -1..-9, -B best match, -d record delimiter (default "\n", a record is a line). Manual page read only; NOT RUN (agrep not installed).

## Commands run (Git-for-Windows bash, GNU grep 3.0, ripgrep 14.1.1, gzip, awk)
Every command block on the page with output was run on the toy file shown, except the seqkit and agrep statements. Observed: grep -c on wrapped file 0, on per-record-unwrapped file 1; grep on .gz 0; rg without -z prints nothing, exit 1; rg -z 1; grep -F -f with a blank pattern line matched 7 of 7 lines; grep -c AA = 1 vs grep -o | wc -l = 3 for AAAAAA; rg -U matched across the break; grep -P failed under LC_ALL=C ("supports only unibyte and UTF-8 locales"), worked under C.utf8.
Timing: 2 million random 60-letter lines (122 MB), one 12-mer; LC_ALL=C, en_US.UTF-8, C.UTF-8 all about 0.44 s; grep -F 0.50 s; rg 0.29 s; grep -i 0.84 s. en_US is not installed on that machine, so this does not test the locale speed claim.

## Interactive toy
The three counts (line search, unwrapped one strand, both strands) were checked in headless Chrome: default pattern at width 17 gives 0 / 1 / 2; width 121 gives 1 / 1 / 2; reverse-complement button; N wildcard; invalid input message. Line-search and one-strand results agree with the grep commands above.

## Open doubts
- LC_ALL=C speed effect: unverified (see above).
- seqkit and agrep behaviour not run.
- seqkit -m: substitution-only is stated in its help; the FM-index fallback for longer patterns not read in detail.
