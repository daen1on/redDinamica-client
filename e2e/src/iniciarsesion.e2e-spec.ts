import { browser, logging } from 'protractor';
import {iniciarsesion} from './iniciarsesion.po';

describe('Registrate a user', function(){
    let page: iniciarsesion;

    beforeEach(() => {
        page = new iniciarsesion;
      });

    it('should do something',()=>{
        page.navigateTo();
        
    });
    afterEach(async () => {
        // Assert that there are no errors emitted from the browser
        const logs = await browser.manage().logs().get(logging.Type.BROWSER);
        expect(logs).not.toContain(jasmine.objectContaining({
          level: logging.Level.SEVERE,
        } as logging.Entry));
      });

    });

