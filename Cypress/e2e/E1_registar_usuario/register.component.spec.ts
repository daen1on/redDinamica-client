describe('RegisterComponent', () => {
    beforeEach(() => {
      // Visita la página de registro
      cy.visit('/registro');
    });
  
    it('should display the correct title', () => {
      // Asegúrate de que el título sea correcto
      cy.get('h2').should('contain', 'El título esperado');
    });
  
    it('should submit the form', () => {
      // Rellena el formulario
      cy.get('#name').type('vgallegoFaci');
      cy.get('#surname').type('test1911.A');
      cy.get('#email').type('test1911.A@ejemplo.com');
      cy.get('#password').type('test1911.A');
      cy.get('#confirmPassword').type('test1911.A');
      
        // Haz clic en el elemento ng-select para abrir el menú desplegable
      cy.get('ng-select[formControlName="profession"]').click();
      // Escribe la nueva opción en el campo de entrada del menú desplegable
      // (Reemplaza 'Nueva profesión' con la opción que quieras agregar)
      cy.get('ng-select[formControlName="profession"]').type('Ingeniero de sistemas');
      // Presiona Enter para agregar la nueva opción
      cy.get('ng-select[formControlName="profession"]').type('{enter}');

      // Haz clic en el elemento ng-select para abrir el menú desplegable
      cy.get('ng-select[formControlName="institution"]').click();
      // Escribe la nueva opción en el campo de entrada del menú desplegable
      cy.get('ng-select[formControlName="institution"]').type('Universidad Industrial de Santander');
      // Presiona Enter para agregar la nueva opción
      cy.get('ng-select[formControlName="institution"]').type('{enter}');

      cy.get('select[formControlName="category"]').select('Facilitador');
      cy.get('#experience').type('Facilitador de prueba');
      cy.get('#tyc').check();
  
      // Envía el formulario
      cy.get('form').submit();
  
      // Comprueba que la página ha cambiado después de enviar el formulario
      // (Reemplaza '/home' con la ruta a la que se redirige después de enviar el formulario)
      cy.url().should('include', '/home');
    });
  });
  