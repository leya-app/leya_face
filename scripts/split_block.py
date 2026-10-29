"""Нарязва блок с реплики на отделни фрази.
Употреба: split_block.py <block.mp3> <first_n> <count> <lines.json> <out_dir>
Паузите между фразите може да са къси (без <break>), затова парчетата реч се
групират с динамично програмиране спрямо очакваната дължина на всяка фраза."""
import json, re, subprocess, sys, math

src, first, count, lines_path, out_dir = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
lines = json.load(open(lines_path))
phr = [l for l in lines if first <= int(l['n']) < first + count]
V = set('аеиоуъюяАЕИОУЪЮЯ')
syl = [max(1, sum(ch in V for ch in p['text'])) for p in phr]

dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout)
err = subprocess.run(['ffmpeg', '-hide_banner', '-i', src, '-af', 'silencedetect=noise=-35dB:d=0.25', '-f', 'null', '-'], capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r'silence_start: ([0-9.]+)', err)]
en = [float(x) for x in re.findall(r'silence_end: ([0-9.]+)', err)]
chunks, prev = [], 0.0
for s, e in zip(st, en):
    if s - prev > 0.05: chunks.append([prev, s])
    prev = e
if dur - prev > 0.1: chunks.append([prev, dur])
N, M = len(chunks), len(phr)
if N < M: sys.exit(f'Само {N} парчета реч за {M} фрази – паузите не стигат.')

rate = sum(c[1] - c[0] for c in chunks) / sum(syl)  # сек на сричка
gap = lambda i: chunks[i + 1][0] - chunks[i][1]   # пауза след парче i
INF = float('inf')
# dp[j][i] = най-малка грешка за първите j фрази с първите i парчета
dp = [[INF] * (N + 1) for _ in range(M + 1)]; bk = [[0] * (N + 1) for _ in range(M + 1)]
dp[0][0] = 0
for j in range(1, M + 1):
    exp = syl[j - 1] * rate
    for i in range(j, N - (M - j) + 1):
        for k in range(j - 1, i):
            if dp[j - 1][k] == INF: continue
            d = chunks[i - 1][1] - chunks[k][0]
            inner = sum(gap(t) for t in range(k, i - 1))          # паузи вътре във фразата
            cost = (math.log(d / exp)) ** 2 + 2.0 * inner
            if dp[j - 1][k] + cost < dp[j][i]: dp[j][i], bk[j][i] = dp[j - 1][k] + cost, k
groups, i = [], N
for j in range(M, 0, -1):
    k = bk[j][i]; groups.append((k, i)); i = k
groups.reverse()
for p, (k, i) in zip(phr, groups):
    # меки окончания: взимаме почти цялата пауза до следващата фраза
    prev_end = chunks[k - 1][1] if k > 0 else 0.0
    next_start = chunks[i][0] if i < N else dur
    a = max(prev_end + 0.02, chunks[k][0] - 0.12)
    b = min(next_start - 0.04, chunks[i - 1][1] + 0.4)
    out = f"{out_dir}/{p['n']}.mp3"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ss', f'{a:.3f}', '-to', f'{b:.3f}',
                    '-af', 'afade=t=in:d=0.02,areverse,afade=t=in:d=0.06,areverse,loudnorm=I=-18:TP=-2',
                    '-ac', '1', '-ar', '44100', '-b:a', '64k', out], check=True)
    print(f"{p['n']}  {a:6.2f}-{b:6.2f}  {b-a:4.2f}s  ({i-k} парч.)  {p['text']}")
