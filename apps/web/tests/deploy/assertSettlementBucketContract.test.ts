import { describe, expect, it } from 'vitest';
import {
  assertArchiveRetentionPeriod,
  assertDistinctBucketNamesPerEnv,
  assertPreviewOmitsSettlementArchiveEnvVars,
  assertProdBucketLockRequiresConfirm,
  assertProductionDoesNotReferenceDevBuckets,
  assertSettlementArchiveEnvVars,
  assertStagingHasNoRetentionLock,
  assertValidateScriptStructure,
} from '../../src/deploy/assertSettlementBucketContract';

describe('assertSettlementBucketContract', () => {
  it('assertArchiveRetentionPeriod_rejectsMissing2555', () => {
    expect(() => assertArchiveRetentionPeriod('# no retention')).toThrow(/2555/);
  });

  it('assertArchiveRetentionPeriod_acceptsValidScript', () => {
    expect(() =>
      assertArchiveRetentionPeriod('gcloud storage buckets update --retention-period=2555d'),
    ).not.toThrow();
  });

  it('assertStagingHasNoRetentionLock_rejectsStagingRetention', () => {
    expect(() =>
      assertStagingHasNoRetentionLock(
        'gcloud storage buckets update gs://staging --retention-period=1d',
        /staging/,
      ),
    ).toThrow(/staging bucket/);
  });

  it('assertProdBucketLockRequiresConfirm_rejectsMissingFlag', () => {
    expect(() => assertProdBucketLockRequiresConfirm('# empty')).toThrow(/CONFIRM_BUCKET_LOCK/);
  });

  it('assertSettlementArchiveEnvVars_rejectsMissingVars', () => {
    expect(() => assertSettlementArchiveEnvVars('# empty', 'prod', 'staging-prod')).toThrow();
  });

  it('assertSettlementArchiveEnvVars_acceptsValidScript', () => {
    const script =
      'SettlementArchive__BucketName=split-rail-settlements-prod,SettlementArchive__StagingBucketName=split-rail-settlements-staging-prod,SettlementArchive__EnforceRetentionValidation=true';
    expect(() =>
      assertSettlementArchiveEnvVars(script, 'split-rail-settlements-prod', 'split-rail-settlements-staging-prod'),
    ).not.toThrow();
  });

  it('assertPreviewOmitsSettlementArchiveEnvVars_rejectsOverrides', () => {
    expect(() =>
      assertPreviewOmitsSettlementArchiveEnvVars('SettlementArchive__BucketName=foo'),
    ).toThrow(/must not set SettlementArchive/);
  });

  it('assertProductionDoesNotReferenceDevBuckets_rejectsDevNames', () => {
    expect(() =>
      assertProductionDoesNotReferenceDevBuckets('split-rail-settlements-dev'),
    ).toThrow(/must not reference split-rail-settlements-dev/);
  });

  it('assertValidateScriptStructure_rejectsIncompleteScript', () => {
    expect(() => assertValidateScriptStructure('# empty')).toThrow();
  });

  it('assertDistinctBucketNamesPerEnv_rejectsIncompleteTable', () => {
    expect(() => assertDistinctBucketNamesPerEnv('split-rail-settlements-dev')).toThrow(
      /must define bucket name/,
    );
  });
});
