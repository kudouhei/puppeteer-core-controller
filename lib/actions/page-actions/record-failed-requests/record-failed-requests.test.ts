import * as puppeteer from 'puppeteer-core';
import * as SUT from './record-failed-requests';
import * as path from 'path';
import { launchBrowser } from '../../browser-actions';
import { getChromePath } from '../../../utils';
import { FakeServer } from 'simple-fake-server';

describe('record failed requests', (): void => {
  let browser: puppeteer.Browser | undefined = undefined;
  let fakeServer: FakeServer | undefined = undefined;
  beforeAll(() => {
    fakeServer = new FakeServer(1234);
    fakeServer.start();
    //The FakeServer now listens on http://localhost:1234
  });
  afterAll(() => {
    if (fakeServer) {
      fakeServer.stop();
    }
  });
  beforeEach((): void => {
    jest.setTimeout(30000);
  });
  afterEach(
    async (): Promise<void> => {
      if (browser) {
        await browser.close();
      }
    },
  );
  test('should record failed requests HTTP 500', async (): Promise<void> => {
    // Given
    browser = await launchBrowser({
      headless: true,
      executablePath: getChromePath(),
    });
    const page = await browser.newPage();
    const errors: puppeteer.Request[] = [];

    fakeServer &&
      fakeServer.http
        .get()
        .to('/500')
        .willFail(500);

    // When
    await SUT.recordFailedRequests(page, (req) => errors.push(req));
    await page.goto(`file:${path.join(__dirname, 'record-failed-requests-500.test.html')}`);
    await page.waitFor(2000);

    // Then
    expect(errors.length).toBe(1);
    expect(errors[0].response()?.status()).toBe(500);
    expect(errors[0].response()?.statusText()).toBe('Internal Server Error');
  });

  test('should record failed requests HTTP 503', async (): Promise<void> => {
    // Given
    browser = await launchBrowser({
      headless: true,
      executablePath: getChromePath(),
    });
    const page = await browser.newPage();
    const errors: puppeteer.Request[] = [];
    fakeServer &&
      fakeServer.http
        .get()
        .to('/503')
        .willFail(503);

    // When
    await SUT.recordFailedRequests(page, (req) => errors.push(req));
    await page.goto(`file:${path.join(__dirname, 'record-failed-requests-503.test.html')}`);
    await page.waitFor(2000);

    // Then
    expect(errors.length).toBe(1);
    expect(errors[0].response()?.status()).toBe(503);
    expect(errors[0].response()?.statusText()).toBe('Service Unavailable');
  });
});
