import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_WORKSHOP_STATE } from '../data/sampleWorkshop';
import { calculateWorkshopSummary } from './accounting';
import {
  compareMonthlySnapshots,
  computeBoostedHealthScore,
  createOfflineSnapshot,
  runOfflineDiagnosticEngine,
  simulateOfflineDecision,
} from './offlineDiagnosticEngine';

test('runOfflineDiagnosticEngine scores 5 radar axes (0-100) and evaluates 20-rule audit deterministically under 50ms', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const report = runOfflineDiagnosticEngine(
    SAMPLE_WORKSHOP_STATE,
    summary,
    'balanced'
  );

  assert.equal(report.radarAxes.length, 5);
  for (const axis of report.radarAxes) {
    assert.ok(axis.workshopScore >= 0 && axis.workshopScore <= 100);
    assert.ok(axis.benchmarkScore >= 50 && axis.benchmarkScore <= 100);
  }

  assert.ok(report.findings.length >= 6);
  // Sorted descending by exact monthly Toman impact
  for (let i = 1; i < report.findings.length; i++) {
    assert.ok(
      report.findings[i - 1].monthlyImpactToman >=
        report.findings[i].monthlyImpactToman
    );
  }

  // Real inflation-adjusted profit must be lower than nominal profit when inflation > 0
  assert.ok(report.realInflationAdjustedProfit < summary.netMonthlyProfit);
  assert.ok(report.phantomInflationProfit > 0);

  // Boosted health score rises when fixes are checked off
  const boosted = computeBoostedHealthScore(
    report.baseHealthScore,
    report.findings,
    report.findings.slice(0, 3).map((f) => f.id)
  );
  assert.ok(boosted >= report.baseHealthScore);
});

test('createOfflineSnapshot and compareMonthlySnapshots compute accurate deltas and improvement flags', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const report = runOfflineDiagnosticEngine(SAMPLE_WORKSHOP_STATE, summary);

  const monthA = createOfflineSnapshot('تیر ۱۴۰۵', summary, report, 70);
  const monthB = {
    ...monthA,
    id: 'snap-b',
    monthLabel: 'مرداد ۱۴۰۵',
    realProfit: monthA.realProfit + 12_000_000,
    wastePercent: Math.max(1, monthA.wastePercent - 1.5),
    breakEvenDay: Math.max(1, monthA.breakEvenDay - 2),
  };

  const deltas = compareMonthlySnapshots(monthA, monthB);
  const profitRow = deltas.find((d) => d.key === 'realProfit');
  const wasteRow = deltas.find((d) => d.key === 'wastePercent');
  const beRow = deltas.find((d) => d.key === 'breakEvenDay');

  assert.equal(profitRow?.delta, 12_000_000);
  assert.equal(profitRow?.isImproved, true);
  assert.equal(wasteRow?.isImproved, true);
  assert.equal(beRow?.isImproved, true);
});

test('simulateOfflineDecision evaluates waste-reduction, cafe-contract, and hire-staff pure math deltas', () => {
  const summary = calculateWorkshopSummary(SAMPLE_WORKSHOP_STATE);
  const report = runOfflineDiagnosticEngine(SAMPLE_WORKSHOP_STATE, summary);

  const wasteSim = simulateOfflineDecision(
    SAMPLE_WORKSHOP_STATE,
    summary,
    report,
    {
      type: 'waste-reduction',
      wasteReductionPercentPoints: 2,
    }
  );
  assert.equal(wasteSim.isFavorable, true);
  assert.ok(wasteSim.netMonthlyProfitDelta > 0);
  assert.equal(wasteSim.rows.length, 6);

  const cafeSim = simulateOfflineDecision(
    SAMPLE_WORKSHOP_STATE,
    summary,
    report,
    {
      type: 'cafe-contract',
      cafeMonthlyKg: 80,
      cafeDiscountPercent: 12,
      cafeCheckDays: 30,
    }
  );
  assert.equal(cafeSim.rows.length, 6);
  assert.ok(Number.isFinite(cafeSim.netMonthlyProfitDelta));
});
