import sys, random, math, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pavement_core import *
P = os.environ.get('PYMASTIC', '../PyMastic')
r = mlet_strains(10, [100, 150], [2500, 200, 60], [0.35, 0.35, 0.45], pymastic_path=P)
print('10t default:', {k: round(v, 1) for k, v in r.items()})
assert abs(r['et'] - 303) < 2 and abs(r['ev'] - 793) < 3
rd = mlet_strains(8.16, [100, 150], [2500, 200, 60], [0.35, 0.35, 0.45], dual_spacing_mm=330, pymastic_path=P)
print('8.16t dual 330:', {k: round(v, 1) for k, v in rd.items()})
# similarity: all E x3 -> strains /3
r3 = mlet_strains(10, [100, 150], [7500, 600, 180], [0.35, 0.35, 0.45], pymastic_path=P)
print('similarity ratio et, ev:', round(r['et'] / r3['et'], 4), round(r['ev'] / r3['ev'], 4))
Nf, Nd = allowable_reps(rd['et'], rd['ev'], 2500, 'AI')
print('AI Nf %.3g Nd %.3g' % (Nf, Nd))
Nf2, Nd2 = allowable_reps(rd['et'], rd['ev'], 2500, 'AUS')
print('AUS Nf %.3g Nd %.3g' % (Nf2, Nd2))
# ESAL example (illustrative VDF values, NOT from MDP)
counts = {'truk_2sumbu': 600, 'truk_3sumbu': 250, 'trailer': 80}
vdf_norm = {'truk_2sumbu': 0.9, 'truk_3sumbu': 2.0, 'trailer': 4.0}
vdf_act = {'truk_2sumbu': 1.6, 'truk_3sumbu': 5.0, 'trailer': 9.0}
e_n, e_a = esal_per_day(counts, vdf_norm), esal_per_day(counts, vdf_act)
print('ESAL/day normal', e_n, 'actual', e_a, 'ratio', round(e_a / e_n, 2))
esal_year_lane = design_esal(e_a, DD=0.5, DL=1.0, years=1)
print('ESAL/yr design lane', esal_year_lane)
L = life_index_years(Nf, Nd, esal_year_lane, growth=0.04)
print('life index years (AI, dual, actual load)', round(L, 2))
s, b = priority_score('pothole', 'High', 0.8, 0.7, True, 1.5, 3, False)
print('priority', s, b)
items = [(f'K{i}', random.Random(i).randint(5, 60) * 1_000_000, random.Random(i + 99).uniform(5, 80)) for i in range(40)]
for t in range(100):
    rnd = random.Random(t)
    its = [(f'K{i}', rnd.randint(5, 60) * 1_000_000, rnd.uniform(5, 80)) for i in range(30)]
    B = rnd.randint(100, 400) * 1_000_000
    c1, v1 = knapsack(its, B); c2, v2 = greedy(its, B)
    assert v1 >= v2 - 1e-9, (t, v1, v2)
    assert sum(c for i, c, _ in its if i in c1) <= B
print('knapsack >= greedy on 100 random cases: OK')
facts = {'et': 227, 'ev': 876, 'L50': 0.4, 'L10': 0.2, 'L90': 0.7, 'esal_day': 1760}
good = 'Regangan tekan tanah dasar 876 µε; Indeks Umur P50 0,4 tahun (rentang 0,2 sampai 0,7). ESAL harian 1.760.'
bad = 'Jalan ini aman, regangan 950 µε dan umur 5 tahun.'
print('checker good:', check_brief(good, facts)); print('checker bad:', check_brief(bad, facts))
assert check_brief(good, facts)['ok'] and not check_brief(bad, facts)['ok']
print('ALL TESTS PASSED')
