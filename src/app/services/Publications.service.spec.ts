import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { PublicationService } from './publication.service';
import { Publication } from '../models/publication.model';

describe('PublicationService', () => {
  let service: PublicationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PublicationService]
    });

    service = TestBed.get(PublicationService);
    httpMock = TestBed.get(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Asegúrate de que no hay solicitudes pendientes.
  });

  // Aquí es donde escribiremos nuestras pruebas
  it('should retrieve publications from the API via GET', () => {
    const dummyPublications: Publication[] = [
      { _id: '1', text: 'Publication 1', user: 'User 1', comments: [], file: null, created_at: new Date() },
      { _id: '2', text: 'Publication 2', user: 'User 2', comments: [], file: null, created_at: new Date() },
    ];
  
    service.getPublications(1).subscribe(publications => {
      expect(publications.length).toBe(2);
      expect(publications).toEqual(dummyPublications);
    });
  
    const request = httpMock.expectOne(`${service.url}/publications/1`);
  
    expect(request.request.method).toBe('GET');
  
    request.flush(dummyPublications);
  });
  
  
});
