// Hệ điều hành + loại node bị giới hạn theo hệ điều hành (Go: App.Platform / StepOnlyOS), nạp một lần.
import { useEffect, useState } from 'react';
import { Platform, StepOnlyOS } from '../../../wailsjs/go/main/App';
import { inWails } from '../../windowMode';
import type { OnlyOS } from '../../flow/platform';

type Info = { goos: string; only: OnlyOS };
let cached: Promise<Info> | null = null;
const load = () => (cached ??= Promise.all([Platform(), StepOnlyOS()]).then(([goos, only]) => ({ goos, only: only ?? {} })));

export function usePlatform(): Info {
  const [info, setInfo] = useState<Info>({ goos: '', only: {} });
  useEffect(() => {
    if (inWails) load().then(setInfo).catch(() => {});
  }, []);
  return info;
}
