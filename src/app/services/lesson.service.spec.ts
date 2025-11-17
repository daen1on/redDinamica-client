import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { LessonService } from './lesson.service';
import { Lesson } from '../models/lesson.model';
import { GLOBAL } from './GLOBAL';

describe('LessonService', () => {
  let service: LessonService;
  let httpMock: HttpTestingController;
  const mockToken = 'mock-jwt-token';
  const baseUrl = GLOBAL.url;

  // Mock data
  const mockLesson: Lesson = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Test Lesson',
    resume: 'Test lesson resume',
    references: 'Test references',
    type: 'consideration',
    level: 'basic',
    development_level: 'garden',
    state: 'proposed',
    call: null,
    expert: null,
    author: '507f1f77bcf86cd799439012',
    leader: null,
    development_group: [],
    created_at: 1640995200,
    visible: true,
    accepted: true,
    knowledge_area: ['Mathematics'],
    grade: 'A',
    views: 0,
    score: 0,
    expert_comments: [],
    comments: [],
    conversations: [],
    files: [],
    father_lesson: null,
    son_lesson: null,
    version: 1,
    justification: 'Test justification',
    class: 'suggest',
    suggested_facilitator: null
  };

  const mockLessonsResponse = {
    lessons: [mockLesson],
    total: 1,
    pages: 1,
    currentPage: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LessonService]
    });
    service = TestBed.inject(LessonService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct base URL', () => {
    expect(service.url).toBe(baseUrl);
  });

  describe('addLesson', () => {
    it('should add a lesson successfully', () => {
      const mockResponse = { lesson: mockLesson };

      service.addLesson(mockToken, mockLesson).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}lesson`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(mockToken);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.body).toBe(JSON.stringify(mockLesson));
      req.flush(mockResponse);
    });

    it('should handle error when adding lesson fails', () => {
      const errorMessage = 'Error adding lesson';

      service.addLesson(mockToken, mockLesson).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}lesson`);
      req.flush({ message: errorMessage }, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getLesson', () => {
    it('should get a specific lesson', () => {
      const lessonId = '507f1f77bcf86cd799439011';
      const mockResponse = { lesson: mockLesson };

      service.getLesson(mockToken, lessonId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}lesson/${lessonId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(mockToken);
      req.flush(mockResponse);
    });
  });

  describe('getLessons', () => {
    it('should get lessons with default parameters', () => {
      service.getLessons(mockToken).subscribe(response => {
        expect(response).toEqual(mockLessonsResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}lessons/true/1`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(mockToken);
      req.flush(mockLessonsResponse);
    });

    it('should get lessons with custom parameters', () => {
      const page = 2;
      const visibleOnes = false;

      service.getLessons(mockToken, page, visibleOnes).subscribe(response => {
        expect(response).toEqual(mockLessonsResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}lessons/false/2`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLessonsResponse);
    });

    it('should convert boolean visibleOnes to string correctly', () => {
      // Test true conversion
      service.getLessons(mockToken, 1, true).subscribe();
      let req = httpMock.expectOne(`${baseUrl}lessons/true/1`);
      req.flush(mockLessonsResponse);

      // Test false conversion
      service.getLessons(mockToken, 1, false).subscribe();
      req = httpMock.expectOne(`${baseUrl}lessons/false/1`);
      req.flush(mockLessonsResponse);
    });

    it('should handle error when getting lessons fails', () => {
      service.getLessons(mockToken).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}lessons/true/1`);
      req.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getAllLessons', () => {
    it('should get all lessons with default parameters', () => {
      service.getAllLessons(mockToken).subscribe(response => {
        expect(response).toEqual(mockLessonsResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}all-lessons/true/created_at`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(mockToken);
      req.flush(mockLessonsResponse);
    });

    it('should get all lessons with custom parameters', () => {
      const orderBy = 'title';
      const visibleOnes = false;

      service.getAllLessons(mockToken, orderBy, visibleOnes).subscribe(response => {
        expect(response).toEqual(mockLessonsResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}all-lessons/false/title`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLessonsResponse);
    });

    it('should convert boolean visibleOnes to string correctly', () => {
      // Test true conversion
      service.getAllLessons(mockToken, 'created_at', true).subscribe();
      let req = httpMock.expectOne(`${baseUrl}all-lessons/true/created_at`);
      req.flush(mockLessonsResponse);

      // Test false conversion
      service.getAllLessons(mockToken, 'created_at', false).subscribe();
      req = httpMock.expectOne(`${baseUrl}all-lessons/false/created_at`);
      req.flush(mockLessonsResponse);
    });
  });

  describe('getMyLessons', () => {
    it('should get my lessons with default page', () => {
      service.getMyLessons(mockToken).subscribe(response => {
        expect(response).toEqual(mockLessonsResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}my-lessons/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLessonsResponse);
    });

    it('should get my lessons with custom page', () => {
      const page = 3;

      service.getMyLessons(mockToken, page).subscribe(response => {
        expect(response).toEqual(mockLessonsResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}my-lessons/3`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLessonsResponse);
    });
  });

  describe('getAllMyLessons', () => {
    it('should get all my lessons', () => {
      service.getAllMyLessons(mockToken).subscribe(response => {
        expect(response).toEqual(mockLessonsResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}all-my-lessons`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLessonsResponse);
    });
  });

  describe('getLessonsToAdvise', () => {
    it('should get lessons to advise', () => {
      service.getLessonsToAdvise(mockToken).subscribe(response => {
        expect(response).toEqual(mockLessonsResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}lessons-to-advise/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLessonsResponse);
    });
  });

  describe('getAllLessonsToAdvise', () => {
    it('should get all lessons to advise', () => {
      service.getAllLessonsToAdvise(mockToken).subscribe(response => {
        expect(response).toEqual(mockLessonsResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}all-lessons-to-advise`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLessonsResponse);
    });
  });

  describe('getCalls', () => {
    it('should get calls', () => {
      service.getCalls(mockToken).subscribe(response => {
        expect(response).toEqual(mockLessonsResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}calls/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLessonsResponse);
    });
  });

  describe('getAllCalls', () => {
    it('should get all calls', () => {
      service.getAllCalls(mockToken).subscribe(response => {
        expect(response).toEqual(mockLessonsResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}all-calls`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLessonsResponse);
    });
  });

  describe('getExperiences', () => {
    it('should get experiences by calling getAllLessons with correct parameters', () => {
      const getAllLessonsSpy = spyOn(service, 'getAllLessons').and.returnValue(of(mockLessonsResponse));

      service.getExperiences(mockToken).subscribe();

      expect(getAllLessonsSpy).toHaveBeenCalledWith(mockToken, 'created_at', false);
    });

    it('should get experiences with custom page parameter (ignored)', () => {
      const getAllLessonsSpy = spyOn(service, 'getAllLessons').and.returnValue(of(mockLessonsResponse));

      service.getExperiences(mockToken, 5).subscribe();

      expect(getAllLessonsSpy).toHaveBeenCalledWith(mockToken, 'created_at', false);
    });
  });

  describe('getSuggestedLesson', () => {
    it('should get suggested lessons by calling getLessons with correct parameters', () => {
      const page = 2;
      const getLessonsSpy = spyOn(service, 'getLessons').and.returnValue(of(mockLessonsResponse));

      service.getSuggestedLesson(mockToken, page).subscribe();

      expect(getLessonsSpy).toHaveBeenCalledWith(mockToken, page, false);
    });
  });

  describe('editLesson', () => {
    it('should edit a lesson successfully', () => {
      const mockResponse = { lesson: mockLesson };

      service.editLesson(mockToken, mockLesson).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}lesson/${mockLesson._id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Authorization')).toBe(mockToken);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.body).toBe(JSON.stringify(mockLesson));
      req.flush(mockResponse);
    });
  });

  describe('deleteLesson', () => {
    it('should delete a lesson successfully', () => {
      const lessonId = '507f1f77bcf86cd799439011';
      const mockResponse = { lesson: mockLesson };

      service.deleteLesson(mockToken, lessonId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}lesson/${lessonId}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Authorization')).toBe(mockToken);
      req.flush(mockResponse);
    });

    it('should handle error when deleting lesson fails', () => {
      const lessonId = '507f1f77bcf86cd799439011';

      service.deleteLesson(mockToken, lessonId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}lesson/${lessonId}`);
      req.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
    });
  });

  // Integration tests for method interactions
  describe('Method Integration Tests', () => {
    it('should ensure getExperiences calls getAllLessons with non-visible lessons', () => {
      service.getExperiences(mockToken).subscribe();

      const req = httpMock.expectOne(`${baseUrl}all-lessons/false/created_at`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLessonsResponse);
    });

    it('should ensure getSuggestedLesson calls getLessons with non-visible lessons', () => {
      const page = 2;
      service.getSuggestedLesson(mockToken, page).subscribe();

      const req = httpMock.expectOne(`${baseUrl}lessons/false/2`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLessonsResponse);
    });
  });

  // Error handling tests
  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      service.getAllLessons(mockToken).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}all-lessons/true/created_at`);
      req.error(new ErrorEvent('Network error'));
    });

    it('should handle HTTP error responses', () => {
      service.getLesson(mockToken, 'invalid-id').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}lesson/invalid-id`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    });
  });
});
