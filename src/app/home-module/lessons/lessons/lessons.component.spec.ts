import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of, throwError } from 'rxjs';
import { Pipe, PipeTransform } from '@angular/core';

import { LessonsComponent } from './lessons.component';
import { LessonService } from 'src/app/services/lesson.service';
import { UserService } from 'src/app/services/user.service';
import { BasicDataService } from 'src/app/services/basicData.service';
import { Router, ActivatedRoute } from '@angular/router';

@Pipe({ name: 'filter', standalone: true })
class FilterPipeStub implements PipeTransform {
  transform(value: any, ...args: any[]): any {
    return value;
  }
}

describe('LessonsComponent', () => {
  let component: LessonsComponent;
  let fixture: ComponentFixture<LessonsComponent>;
  let lessonService: jasmine.SpyObj<LessonService>;
  let userService: jasmine.SpyObj<UserService>;
  let basicDataService: jasmine.SpyObj<BasicDataService>;
  let router: jasmine.SpyObj<Router>;

  const mockToken = 'mock-jwt-token';
  const mockIdentity = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Test User',
    email: 'test@test.com'
  };

  const mockLesson = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Test Lesson',
    resume: 'Test lesson resume',
    type: 'consideration',
    level: 'basic',
    state: 'proposed',
    knowledge_area: [{ name: 'Mathematics' }],
    development_level: 'garden',
    views: 5
  };

  const mockLessonsResponse = {
    lessons: [mockLesson],
    total: 1,
    pages: 1,
    currentPage: 1
  };

  const mockAreas = [
    { _id: '1', name: 'Mathematics' },
    { _id: '2', name: 'Science' }
  ];

  beforeEach(async () => {
    const lessonServiceSpy = jasmine.createSpyObj('LessonService', [
      'getAllLessons',
      'getLessons'
    ]);
    const userServiceSpy = jasmine.createSpyObj('UserService', [
      'getToken',
      'getIdentity'
    ]);
    const basicDataServiceSpy = jasmine.createSpyObj('BasicDataService', [
      'getAllKnowledgeAreas'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [LessonsComponent],
      imports: [
        CommonModule,
        RouterTestingModule,
        HttpClientTestingModule,
        ReactiveFormsModule,
        FilterPipeStub
      ],
      providers: [
        { provide: LessonService, useValue: lessonServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: BasicDataService, useValue: basicDataServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();
    
    // Prepare spies BEFORE component creation so constructor reads correct values
    lessonService = TestBed.inject(LessonService) as jasmine.SpyObj<LessonService>;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    basicDataService = TestBed.inject(BasicDataService) as jasmine.SpyObj<BasicDataService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    userService.getToken.and.returnValue(mockToken);
    userService.getIdentity.and.returnValue(mockIdentity as any);
    lessonService.getAllLessons.and.returnValue(of(mockLessonsResponse));
    // ensure editLesson exists to avoid TypeError in increaseViews
    (lessonService as any).editLesson = jasmine.createSpy('editLesson').and.returnValue(of({ lesson: { ...mockLesson } }));
    basicDataService.getAllKnowledgeAreas.and.returnValue(of({ areas: mockAreas.map(area => ({ ...area, used: false })) }));

    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');

    fixture = TestBed.createComponent(LessonsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct properties', () => {
    expect(component.title).toBe('Lecciones');
    expect(component.token).toBe(mockToken);
    expect(component.identity).toBe(mockIdentity);
    expect(component.loading).toBe(true);
    expect(component.selectedAreas).toEqual([]);
    expect(component.selectedLevels).toEqual([]);
  });

  it('should initialize form controls', () => {
    expect(component.visible).toBeInstanceOf(UntypedFormControl);
    expect(component.orderControl).toBeInstanceOf(UntypedFormControl);
    expect(component.filter).toBeInstanceOf(UntypedFormControl);
  });

  describe('ngOnInit', () => {
    it('should call getAllLessons and getAllAreas', () => {
      spyOn(component, 'getAllLessons');
      spyOn(component, 'getAllAreas');

      component.ngOnInit();

      expect(component.getAllLessons).toHaveBeenCalled();
      expect(component.getAllAreas).toHaveBeenCalled();
    });
  });

  describe('getAllLessons', () => {
    beforeEach(() => {
      component.orderBy = 'created_at';
    });

    it('should get all lessons successfully', () => {
      component.getAllLessons();

      expect(lessonService.getAllLessons).toHaveBeenCalledWith(mockToken, 'created_at', true);
      expect(component.allLessons).toEqual(mockLessonsResponse.lessons);
    });

    it('should handle error when getting lessons fails', () => {
      lessonService.getAllLessons.and.returnValue(throwError(() => 'Error'));
      spyOn(console, 'log');

      component.getAllLessons();

      expect(lessonService.getAllLessons).toHaveBeenCalled();
      // Component should handle error gracefully
    });

    it('should filter lessons by selected areas', () => {
      component.selectedAreas = ['Mathematics'];
      const mockLessonsWithAreas = {
        lessons: [
          { ...mockLesson, knowledge_area: [{ name: 'Mathematics' }] },
          { ...mockLesson, _id: '2', knowledge_area: [{ name: 'Science' }] }
        ]
      };
      lessonService.getAllLessons.and.returnValue(of(mockLessonsWithAreas));

      component.getAllLessons();

      expect(component.allLessons.length).toBe(1);
      expect(component.allLessons[0].knowledge_area[0].name).toBe('Mathematics');
    });

    it('should filter lessons by selected levels', () => {
      component.selectedLevels = ['garden'];
      const mockLessonsWithLevels = {
        lessons: [
          { ...mockLesson, level: 'garden' },
          { ...mockLesson, _id: '2', level: 'school' }
        ]
      };
      lessonService.getAllLessons.and.returnValue(of(mockLessonsWithLevels));

      component.getAllLessons();

      expect(component.allLessons.length).toBe(1);
      expect(component.allLessons[0].level).toBe('garden');
    });
  });

  describe('getAllAreas', () => {
    it('should get areas from localStorage if available', () => {
      localStorage.getItem = jasmine.createSpy().and.returnValue(JSON.stringify(mockAreas));

      component.getAllAreas();

      expect(localStorage.getItem).toHaveBeenCalledWith('areas');
      expect(component.areas).toEqual(mockAreas);
    });

    it('should fetch areas from service if not in localStorage', () => {
      localStorage.getItem = jasmine.createSpy().and.returnValue(null);

      component.getAllAreas();

      expect(basicDataService.getAllKnowledgeAreas).toHaveBeenCalled();
      // En el componente se guarda con { used: false }
      expect(component.areas).toEqual(mockAreas.map(a => ({ ...a, used: false })));
      expect(localStorage.setItem).toHaveBeenCalledWith('areas', JSON.stringify(mockAreas.map(a => ({ ...a, used: false }))));
    });

    it('should handle error when fetching areas fails', () => {
      localStorage.getItem = jasmine.createSpy().and.returnValue(null);
      basicDataService.getAllKnowledgeAreas.and.returnValue(throwError(() => 'Error'));
      spyOn(console, 'log');

      component.getAllAreas();

      expect(basicDataService.getAllKnowledgeAreas).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('setArea', () => {
    beforeEach(() => {
      spyOn(component, 'getAllLessons');
    });

    it('should add area to selectedAreas if not present', () => {
      const area = 'Mathematics';
      component.selectedAreas = [];

      component.setArea(area);

      expect(component.selectedAreas).toContain(area);
      expect(component.getAllLessons).toHaveBeenCalled();
    });

    it('should remove area from selectedAreas if already present', () => {
      const area = 'Mathematics';
      component.selectedAreas = [area];

      component.setArea(area);

      expect(component.selectedAreas).not.toContain(area);
      expect(component.getAllLessons).toHaveBeenCalled();
    });
  });

  describe('setLevel', () => {
    beforeEach(() => {
      spyOn(component, 'getAllLessons');
    });

    it('should add level to selectedLevels if not present', () => {
      const level = 'garden';
      component.selectedLevels = [];

      component.setLevel(level);

      expect(component.selectedLevels).toContain(level);
      expect(component.getAllLessons).toHaveBeenCalled();
    });

    it('should remove level from selectedLevels if already present', () => {
      const level = 'garden';
      component.selectedLevels = [level];

      component.setLevel(level);

      expect(component.selectedLevels).not.toContain(level);
      expect(component.getAllLessons).toHaveBeenCalled();
    });
  });

  describe('getLessons', () => {
    beforeEach(() => {
      lessonService.getLessons = jasmine.createSpy().and.returnValue(of(mockLessonsResponse));
    });

    it('should get lessons for specific page', () => {
      const page = 2;

      component.getLessons(page);

      expect(lessonService.getLessons).toHaveBeenCalledWith(mockToken, page, true);
      expect(component.lessons).toEqual(mockLessonsResponse.lessons);
      expect(component.total).toBe(mockLessonsResponse.total);
      expect(component.pages).toBe(mockLessonsResponse.pages);
      expect(component.page).toBe(mockLessonsResponse.currentPage);
    });

    it('should handle error when getting lessons fails', () => {
      lessonService.getLessons.and.returnValue(throwError(() => 'Error'));
      spyOn(console, 'log');

      component.getLessons();

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('setShowAreas', () => {
    it('should toggle showAreas property', () => {
      component.showAreas = false;

      component.setShowAreas();

      expect(component.showAreas).toBe(true);

      component.setShowAreas();

      expect(component.showAreas).toBe(false);
    });
  });

  describe('setShowLevels', () => {
    it('should toggle showLevels property', () => {
      component.showLevels = false;

      component.setShowLevels();

      expect(component.showLevels).toBe(true);

      component.setShowLevels();

      expect(component.showLevels).toBe(false);
    });
  });

  describe('increaseViews', () => {
    it('should increase lesson views by 1', () => {
      const lesson = { ...mockLesson, views: 5 };

      component.increaseViews(lesson);

      expect(lesson.views).toBe(6);
    });

    it('should handle lesson with undefined views', () => {
      const lesson = { ...mockLesson };
      delete lesson.views;

      component.increaseViews(lesson);

      expect(lesson.views).toBe(1);
    });
  });

  describe('setNeedReload', () => {
    it('should set needReloadData property', () => {
      const event = true;

      component.setNeedReload(event);

      expect(component.needReloadData).toBe(event);
    });
  });

  describe('reloadLessons', () => {
    beforeEach(() => {
      spyOn(component, 'getAllLessons');
      spyOn(component, 'getLessons');
    });

    it('should reload lessons when needReloadData is true', () => {
      component.needReloadData = true;
      component.page = 2;

      component.reloadLessons();

      expect(component.getAllLessons).toHaveBeenCalled();
      expect(component.getLessons).toHaveBeenCalledWith(2);
      expect(component.needReloadData).toBe(false);
    });

    it('should not reload lessons when needReloadData is false', () => {
      component.needReloadData = false;

      component.reloadLessons();

      expect(component.getAllLessons).not.toHaveBeenCalled();
      expect(component.getLessons).not.toHaveBeenCalled();
    });
  });

  describe('Component Properties', () => {
    it('should have correct level mappings', () => {
      expect(component.level).toEqual({
        basic: "Básico",
        medium: "Medio",
        advanced: "Avanzado"
      });
    });

    it('should have correct type mappings', () => {
      expect(component.type).toEqual({
        consideration: "Consideración",
        development: "Desarrollo"
      });
    });

    it('should have correct states array', () => {
      expect(component.states).toContain(jasmine.objectContaining({
        label: "Propuesta",
        value: "proposed",
        class: "secondary"
      }));
      expect(component.states).toContain(jasmine.objectContaining({
        label: "Terminada",
        value: "completed",
        class: "success"
      }));
    });

    it('should have correct levels array', () => {
      expect(component.levels).toContain(jasmine.objectContaining({
        label: "Preescolar",
        value: "garden"
      }));
      expect(component.levels).toContain(jasmine.objectContaining({
        label: "Universitario",
        value: "university"
      }));
    });
  });

  describe('Integration Tests', () => {
    it('should filter lessons by both areas and levels', () => {
      component.selectedAreas = ['Mathematics'];
      component.selectedLevels = ['garden'];
      
      const mockFilteredLessons = {
        lessons: [
          { 
            ...mockLesson, 
            knowledge_area: [{ name: 'Mathematics' }],
            development_level: 'garden'
          },
          { 
            ...mockLesson, 
            _id: '2',
            knowledge_area: [{ name: 'Science' }],
            development_level: 'garden'
          },
          { 
            ...mockLesson, 
            _id: '3',
            knowledge_area: [{ name: 'Mathematics' }],
            development_level: 'school'
          }
        ]
      };
      
      lessonService.getAllLessons.and.returnValue(of(mockFilteredLessons));

      component.getAllLessons();

      // Should only return lessons that match both area AND level filters
      expect(component.allLessons.length).toBe(1);
      expect(component.allLessons[0].knowledge_area[0].name).toBe('Mathematics');
      expect(component.allLessons[0].development_level).toBe('garden');
    });

    it('should handle empty lesson responses', () => {
      lessonService.getAllLessons.and.returnValue(of({ lessons: null }));

      component.getAllLessons();

      expect(component.allLessons).toEqual([]);
    });
  });
});