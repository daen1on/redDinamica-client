import { ReddinamicaLandingPage } from './LandingP.po';
import { browser, logging } from 'protractor';

describe('workspace-project App', () => {
  let page: ReddinamicaLandingPage;

  beforeEach(() => {
    page = new ReddinamicaLandingPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getTitleText()).toEqual('RedDinámica');
  });
  
  afterEach(async () => {
    // Assert that there are no errors emitted from the browser
    const logs = await browser.manage().logs().get(logging.Type.BROWSER);
    expect(logs).not.toContain(jasmine.objectContaining({
      level: logging.Level.SEVERE,
    } as logging.Entry));
  });
});
