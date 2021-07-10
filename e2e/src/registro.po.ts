import { browser, element, by } from 'protractor';

export class registro {

    navigateTo(){
        return browser.get(browser.baseUrl);
    }
    
    clickRegister() {
        return element(by.css('btn btn-primary btn-lg'));
      }
    getTitleForm(){
        return element(by.css('card-title text-center'));
    }
    getCrearCuentaBtn(){
        return element(by.css('btn btn-success btn-block my-2 ml-lg-2 my-sm-2'));
    }
    navigateToReg(){
        return browser.get(browser.baseUrl+"/registro");
    }
    getNombre(){
        return element(by.id("name"));
    }
    
    getApellidos(){
        return element(by.id("name"));
    }
    
    getEmail(){
        return element(by.id("email"));
    }
    
    getPass(){
        return element(by.id("password"));
    }
    
    getCPass(){
        return element(by.id("confirmPassword"));
    }
    getProf(){
        return element(by.css("input[formControlName=profession]"));
    }
    getSelected(){
        return element(by.class("ng-option ng-option-marked"));
    }
    getInsti(){
        return element(by.css("input[formControlName=institution]"));
    }

    getRoleF(){
        return element(by.cssContainingText('option', 'Facilitador'));
    }
    
    getRoleD(){
        return element(by.cssContainingText('option', 'Docente'));
    }
    
    getRoleE(){
        return element(by.cssContainingText('option', 'Estudiante'));
    }
    
    getRoleI(){
        return element(by.cssContainingText('option', 'Invitado'));
    }
    getExp(){
        return element(by.id("experience"));
    }
    
    getTyc(){
        return element(by.css("form-check-input"));
    }

    getRegisterBtn(){
        return element(by.css("btn btn-success btn-block btn-lg"));
    }
    
    alreadySigned(){
        return element(by.css("dropdown-item py-2"));
    }
    
    

    


    
}