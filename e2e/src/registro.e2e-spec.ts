import { async } from '@angular/core/testing';
import { browser, logging, ExpectedConditions } from 'protractor';
import {registro} from './registro.po';

describe('Registrate a user', function(){
    let page: registro;
    // expect(await greeting.getText()).toEqual('Hello Julie!');
    //agregar async await
    beforeEach(() => {
        page = new registro;
      });

    it (' should go from landing page to registration form via  Comienza Aqui', async function (){
        await page.navigateTo();
        await page.clickRegister().click();
        expect(page.getTitleForm()).toBe('Registro');
    });
    it('should go from landing page to registration form via Crear una cuenta',async function (){
        await page.navigateTo();
        await page.getCrearCuentaBtn().click();
        expect(page.getTitleForm()).toBe('Registro');
    });
    it('should insert a user', async function (){
      await page.navigateToReg(); // /registro puede que tire /"
      expect(await page.getTitleForm()).toBe('Registro');
      await page.getNombre().sendKeys("Juanita");
      await page.getApellidos().sendKeys("cubides");
      await page.getEmail().sendKeys("vidagum123@hotmail.com  ");
      await page.getPass().sendKeys("prueba");
      await page.getCPass().sendKeys("prueba");
      await page.getProf().sendKeys("Ingeniero de sistemas");
      await page.getSelected().click(); //to add the 
      await expect(await page.getSelected).toBe("Ingeniero de sistemas");
      await page.getInsti().sendKeys("UIS");
      await page.getSelected().click();
      await expect(await page.getSelected).toBe("UIS");
      await page.getRoleF().click();
      await page.getExp().sendKeys("lorem ipsum asdk dkd kisp dkep ksk dikslp maksm ksdk ||||°° @ ");
      await page.getTyc().click();
      await page.getRegisterBtn().click();
      const EC = ExpectedConditions;
      await browser.wait(EC.urlContains('localhost:4200/inicio'), 5000);
      expect(browser.getCurrentUrl()).toEqual("localhost:4200/inicio");

      //agregar admin
      //aceptar usuario 
      //iniciar sesion con nuevo usuario
      //ante de eso comprobar que no se activa si no se reinicia el usuario
      //hacer expects de lo que hay
      // hay que revisar bien la pagina para cada caso
    });
    
    

    afterEach(async () => {
        // Assert that there are no errors emitted from the browser
        const logs = await browser.manage().logs().get(logging.Type.BROWSER);
        expect(logs).not.toContain(jasmine.objectContaining({
          level: logging.Level.SEVERE,
        } as logging.Entry));
      });
});
