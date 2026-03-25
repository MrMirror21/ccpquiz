# Troubleshooting: 모바일에서 PDF 파싱 실패

## 증상

- PC 브라우저에서는 PDF 업로드 및 파싱이 정상 동작
- iOS 모바일 브라우저(Safari, Chrome)에서 동일한 PDF 파일을 올리면 파싱 실패
- 에러 메시지: `undefined is not a function (near '...t of e...')`
- 스택 트레이스에서 `getTextContent` 함수 내부에서 발생 확인

## 원인 분석

### 1차 시도: Web Worker 문제 (commit ef0bf25 ~ e4cb54e)

iOS WebKit은 `new Worker(url, { type: "module" })` 형태의 ES module Web Worker 생성에 실패한다.
pdf.js worker를 메인 스레드에 직접 번들링하여 우회했다.

```typescript
const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.mjs");
(globalThis as any).pdfjsWorker = pdfjsWorker;
```

**결과:** 해결 안 됨 — Worker 문제는 해결됐지만 동일한 에러 지속.

### 2차 시도: legacy 빌드 사용 (commit 1f7fbb8)

`pdfjs-dist`의 기본 import는 modern 빌드(`build/pdf.mjs`)를 가리킨다.
모바일 Safari에서 지원하지 않는 최신 JS 문법이 포함되어 있으므로 legacy 빌드로 변경했다.

```typescript
// before
const pdfjsLib = await import("pdfjs-dist");
const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.mjs");

// after
const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
```

**결과:** 해결 안 됨 — legacy 빌드도 동일한 에러 발생.

### 3차 시도 (최종 해결): 폴리필 추가 (commit 6348eef)

legacy 빌드 소스를 직접 분석한 결과, "legacy"라는 이름과 달리 최신 JS API를 그대로 사용하고 있었다:

| 위치 | 코드 | 필요한 API |
|------|------|-----------|
| `getTextContent` (L21722) | `for await (const value of readableStream)` | `ReadableStream.prototype[Symbol.asyncIterator]` |
| `sendWithStream` (L14971) | `Promise.withResolvers()` | `Promise.withResolvers` (ES2024) |
| 기타 | `this.#privateField`, `??=`, `&&=` | ES2021~2022 |

`ReadableStream`의 async iteration(`Symbol.asyncIterator`)은 iOS WebKit에서 비교적 최근에 추가된 기능이라 구형 기기에서 지원되지 않는다.
minified 코드에서 `for await (const t of e)` → `t of e`에서 `e[Symbol.asyncIterator]`가 `undefined`이므로 함수로 호출할 수 없어 에러가 발생한 것.

**해결:** pdfjs-dist import 전에 두 가지 폴리필을 설치:

```typescript
// ReadableStream async iteration 폴리필
if (
  typeof ReadableStream !== "undefined" &&
  !(ReadableStream.prototype as any)[Symbol.asyncIterator]
) {
  (ReadableStream.prototype as any)[Symbol.asyncIterator] =
    async function* () {
      const reader = this.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) return;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    };
}

// Promise.withResolvers 폴리필
if (typeof Promise.withResolvers !== "function") {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (v: T | PromiseLike<T>) => void;
    let reject!: (r?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
```

**결과:** 해결됨.

## 핵심 교훈

1. **pdfjs-dist v5의 "legacy" 빌드는 실제 legacy가 아니다.** `#privateField`, `??=`, `for await...of ReadableStream` 등 ES2021+ 문법이 트랜스파일 없이 포함되어 있다.

2. **iOS에서 모든 브라우저는 WebKit을 사용한다.** Chrome, Firefox 등 다른 브라우저를 써도 내부 엔진은 Safari와 동일하므로, Safari에서 안 되면 다른 브라우저에서도 안 된다.

3. **minified 에러 메시지 해독.** `undefined is not a function (near '...t of e...')` → `for (const t of e)` 또는 `for await (const t of e)`에서 iterable 프로토콜이 없는 객체를 순회하려는 패턴.

4. **모바일 디버깅 팁.** 배포 환경에서만 재현되는 에러는 스택 트레이스를 화면에 직접 출력하는 것이 가장 빠른 디버깅 방법이다.

## 관련 커밋

| 커밋 | 설명 |
|------|------|
| `ef0bf25` | PDF.js worker를 public/에서 서빙 |
| `3658570` | pdfjs-dist legacy 빌드 사용 |
| `db2436c` | Promise.withResolvers, Array.at, structuredClone 폴리필 추가 |
| `c2470fa` | 다크모드 방지 (light mode 강제) |
| `e4cb54e` | Web Worker 우회 (메인 스레드 번들링) |
| `1f7fbb8` | legacy 빌드 경로 수정 + 에러 스택 전체 출력 |
| `6348eef` | ReadableStream async iteration + Promise.withResolvers 폴리필 (최종 해결) |
