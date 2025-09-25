import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Pipe, PipeTransform } from '@angular/core';
import { of, throwError, Subject } from 'rxjs';

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

describe('Admin LessonsComponent', () => {
  let component: LessonsComponent;
  let fixture: ComponentFixture<LessonsComponent>;
  let lessonService: jasmine.SpyObj<LessonService>;
  let userService: jasmine.SpyObj<UserService>;
  let basicDataService: jasmine.SpyObj<BasicDataService>;
  let router: jasmine.SpyObj<Router>;
  let changeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;

  const mockToken = 'mock-jwt-token';
  const mockIdentity = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'admin'
  };

  const mockLesson = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Test Admin Lesson',
    resume: 'Test lesson resume',
    type: 'consideration',
    level: 'basic',
    state: 'proposed',
    knowledge_area: [{ name: 'Mathematics' }],
    development_level: 'garden',
    academic_level: ['garden'],
    visible: true,
    views: 10
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

  const mockParamsSubject = new Subject();
  const mockActivatedRoute = {
    params: mockParamsSubject.asObservable(),
    queryParams: of({})
  };

  beforeEach(async () => {
    const lessonServiceSpy = jasmine.createSpyObj('LessonService', [
      'getAllLessons',
      'getLessons',
      'editLesson'
    ]);
    const userServiceSpy = jasmine.createSpyObj('UserService', [
      'getToken',
      'getIdentity'
    ]);
    const basicDataServiceSpy = jasmine.createSpyObj('BasicDataService', [
      'getAllKnowledgeAreas'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const changeDetectorRefSpy = jasmine.createSpyObj('ChangeDetectorRef', [
      'detectChanges'
    ]);

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
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ChangeDetectorRef, useValue: changeDetectorRefSpy }
      ]
    }).compileComponents();
    
    // Prepare spies BEFORE creating component so constructor reads correct values
    lessonService = TestBed.inject(LessonService) as jasmine.SpyObj<LessonService>;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    basicDataService = TestBed.inject(BasicDataService) as jasmine.SpyObj<BasicDataService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    changeDetectorRef = TestBed.inject(ChangeDetectorRef) as jasmine.SpyObj<ChangeDetectorRef>;

    userService.getToken.and.returnValue(mockToken);
    userService.getIdentity.and.returnValue(mockIdentity as any);
    lessonService.getAllLessons.and.returnValue(of(mockLessonsResponse));
    lessonService.getLessons.and.returnValue(of(mockLessonsResponse));
    lessonService.editLesson.and.returnValue(of({ lesson: { ...mockLesson } }));
    basicDataService.getAllKnowledgeAreas.and.returnValue(of({ areas: mockAreas.map(area => ({ ...area, used: false })) }));

    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(mockAreas));
    spyOn(localStorage, 'setItem');

    fixture = TestBed.createComponent(LessonsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    mockParamsSubject.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct properties', () => {
    expect(component.title).toBe('Lecciones');
    expect(component.token).toBe(mockToken);
    expect(component.identity).toBe(mockIdentity);
    expect(component.loading).toBe(true);
    expect(component.selectedStates).toEqual([]);
    expect(component.selectedAreas).toEqual([]);
    expect(component.selectedLevels).toEqual([]);
  });

  it('should initialize form controls', () => {
    expect(component.filter).toBeInstanceOf(FormControl);
    expect(component.orderControl).toBeInstanceOf(FormControl);
    expect(component.visible).toBeDefined();
  });

  describe('ngOnInit', () => {
    it('should call loadInitialData', () => {
      spyOn(component, 'loadInitialData');

      component.ngOnInit();

      expect(component.loadInitialData).toHaveBeenCalled();
    });

    it('should subscribe to filter value changes', () => {
      spyOn(component, 'applyFilters');
      
      component.ngOnInit();
      component.filter.setValue('test');

      expect(component.applyFilters).toHaveBeenCalledWith(component.allLessons);
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete unsubscribe subject', () => {
      spyOn(component.unsubscribe$, 'next');
      spyOn(component.unsubscribe$, 'complete');

      component.ngOnDestroy();

      expect(component.unsubscribe$.next).toHaveBeenCalled();
      expect(component.unsubscribe$.complete).toHaveBeenCalled();
    });
  });

  describe('loadInitialData', () => {
    it('should fetch lessons and areas on initialization', () => {
      spyOn(component, 'fetchLessons');
      spyOn(component, 'fetchAllLessons');

      component.loadInitialData();
      mockParamsSubject.next({ page: '2' });

      expect(component.fetchLessons).toHaveBeenCalledWith(2);
      expect(component.fetchAllLessons).toHaveBeenCalled();
      expect(component.areas).toEqual(mockAreas);
    });

    it('should handle default page when no page param provided', () => {
      spyOn(component, 'fetchLessons');

      component.loadInitialData();
      mockParamsSubject.next({});

      expect(component.fetchLessons).toHaveBeenCalledWith(1);
    });

    it('should handle error when fetching areas', () => {
      basicDataService.getAllKnowledgeAreas.and.returnValue(throwError('Error'));
      spyOn(console, 'error');

      component.loadInitialData();

      expect(console.error).toHaveBeenCalledWith('Error fetching areas:', 'Error');
    });
  });

  describe('fetchAllLessons', () => {
    it('should fetch all lessons with default order', () => {
      component.orderControl.setValue('');

      component.fetchAllLessons();

      expect(lessonService.getAllLessons).toHaveBeenCalledWith(mockToken, 'created_at', true);
      expect(component.allLessons).toEqual(mockLessonsResponse.lessons);
      expect(component.total).toBe(mockLessonsResponse.total);
      expect(component.pages).toBe(mockLessonsResponse.pages);
      expect(component.loading).toBe(false);
    });

    it('should fetch all lessons with custom order', () => {
      component.orderControl.setValue('title');

      component.fetchAllLessons();

      expect(lessonService.getAllLessons).toHaveBeenCalledWith(mockToken, 'title', true);
    });

    it('should handle error when fetching lessons fails', () => {
      lessonService.getAllLessons.and.returnValue(throwError('Error'));
      spyOn(console, 'error');

      component.fetchAllLessons();

      expect(console.error).toHaveBeenCalledWith('Error fetching all lessons:', 'Error');
    });
  });

  describe('fetchLessons', () => {
    it('should fetch lessons for specific page', () => {
      const page = 2;

      component.fetchLessons(page);

      expect(lessonService.getLessons).toHaveBeenCalledWith(mockToken, page, true);
      expect(component.lessons).toEqual(mockLessonsResponse.lessons);
      expect(component.total).toBe(mockLessonsResponse.total);
      expect(component.pages).toBe(mockLessonsResponse.pages);
      expect(component.page).toBe(mockLessonsResponse.currentPage);
    });

    it('should handle error when fetching lessons fails', () => {
      lessonService.getLessons.and.returnValue(throwError('Error'));
      spyOn(console, 'error');

      component.fetchLessons(1);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('setState', () => {
    beforeEach(() => {
      spyOn(component, 'fetchAllLessons');
    });

    it('should add state to selectedStates if not present', () => {
      const state = 'proposed';
      component.selectedStates = [];

      component.setState(state);

      expect(component.selectedStates).toContain(state);
      expect(component.fetchAllLessons).toHaveBeenCalled();
    });

    it('should remove state from selectedStates if already present', () => {
      const state = 'proposed';
      component.selectedStates = [state];

      component.setState(state);

      expect(component.selectedStates).not.toContain(state);
      expect(component.fetchAllLessons).toHaveBeenCalled();
    });
  });

  describe('setArea', () => {
    beforeEach(() => {
      spyOn(component, 'fetchAllLessons');
    });

    it('should add area to selectedAreas if not present', () => {
      const area = 'Mathematics';
      component.selectedAreas = [];

      component.setArea(area);

      expect(component.selectedAreas).toContain(area);
      expect(component.fetchAllLessons).toHaveBeenCalled();
    });

    it('should remove area from selectedAreas if already present', () => {
      const area = 'Mathematics';
      component.selectedAreas = [area];

      component.setArea(area);

      expect(component.selectedAreas).not.toContain(area);
      expect(component.fetchAllLessons).toHaveBeenCalled();
    });
  });

  describe('setLevel', () => {
    beforeEach(() => {
      spyOn(component, 'fetchAllLessons');
    });

    it('should add level to selectedLevels if not present', () => {
      const level = 'garden';
      component.selectedLevels = [];

      component.setLevel(level);

      expect(component.selectedLevels).toContain(level);
      expect(component.fetchAllLessons).toHaveBeenCalled();
    });

    it('should remove level from selectedLevels if already present', () => {
      const level = 'garden';
      component.selectedLevels = [level];

      component.setLevel(level);

      expect(component.selectedLevels).not.toContain(level);
      expect(component.fetchAllLessons).toHaveBeenCalled();
    });
  });

  describe('setOrder', () => {
    it('should set order control value and refetch lessons', () => {
      spyOn(component, 'fetchAllLessons');
      const orderCriteria = 'title';

      component.setOrder(orderCriteria);

      expect(component.orderControl.value).toBe(orderCriteria);
      expect(component.fetchAllLessons).toHaveBeenCalled();
    });
  });

  describe('navigateToPage', () => {
    it('should navigate to specific page', () => {
      const page = 3;

      component.navigateToPage(page);

      expect(router.navigate).toHaveBeenCalledWith(['/admin/lecciones', page]);
    });
  });

  describe('applyFilters', () => {
    const mockLessons = [
      { ...mockLesson, title: 'Mathematics Lesson' },
      { ...mockLesson, _id: '2', title: 'Science Lesson' }
    ];

    it('should filter lessons by title', () => {
      component.filter.setValue('mathematics');

      component.applyFilters(mockLessons);

      expect(component.filteredLessons.length).toBe(1);
      expect(component.filteredLessons[0].title).toBe('Mathematics Lesson');
    });

    it('should return all lessons when no filter is applied', () => {
      component.filter.setValue('');

      component.applyFilters(mockLessons);

      expect(component.filteredLessons).toEqual(mockLessons);
    });

    it('should handle case-insensitive filtering', () => {
      component.filter.setValue('MATHEMATICS');

      component.applyFilters(mockLessons);

      expect(component.filteredLessons.length).toBe(1);
      expect(component.filteredLessons[0].title).toBe('Mathematics Lesson');
    });
  });

  describe('setNeedReload', () => {
    it('should trigger actualPage and fetchAllLessons', () => {
      spyOn(component, 'actualPage');
      spyOn(component, 'fetchAllLessons');
      spyOn(console, 'log');
      const eventData = { reload: true };

      component.setNeedReload(eventData);

      expect(console.log).toHaveBeenCalledWith(eventData);
      expect(component.actualPage).toHaveBeenCalled();
      expect(component.fetchAllLessons).toHaveBeenCalled();
      expect(changeDetectorRef.detectChanges).toHaveBeenCalled();
    });
  });

  describe('getAcademicLevels', () => {
    it('should join academic levels with commas', () => {
      const levels = ['garden', 'school', 'university'];

      const result = component.getAcademicLevels(levels);

      expect(result).toBe('garden, school, university');
    });

    it('should handle single level', () => {
      const levels = ['garden'];

      const result = component.getAcademicLevels(levels);

      expect(result).toBe('garden');
    });

    it('should handle empty levels array', () => {
      const levels = [];

      const result = component.getAcademicLevels(levels);

      expect(result).toBe('');
    });
  });

  describe('editLesson', () => {
    it('should call lessonService.editLesson', () => {
      lessonService.editLesson.and.returnValue(of({ lesson: mockLesson }));
      const lesson = { ...mockLesson };

      component.editLesson(lesson);

      expect(lessonService.editLesson).toHaveBeenCalledWith(mockToken, lesson);
    });

    it('should handle visibility change', () => {
      lessonService.editLesson.and.returnValue(of({ lesson: mockLesson }));
      const lesson = { ...mockLesson };

      component.editLesson(lesson, true);

      expect(lessonService.editLesson).toHaveBeenCalledWith(mockToken, lesson);
      // Additional logic for visibility change could be tested here
    });
  });

  describe('setShowAreas', () => {
    it('should set showAreas property', () => {
      component.setShowAreas(true);
      expect(component.showAreas).toBe(true);

      component.setShowAreas(false);
      expect(component.showAreas).toBe(false);
    });
  });

  describe('setShowLevels', () => {
    it('should set showLevels property', () => {
      component.setShowLevels(true);
      expect(component.showLevels).toBe(true);

      component.setShowLevels(false);
      expect(component.showLevels).toBe(false);
    });
  });

  describe('Component Properties', () => {
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

    it('should have academic_level and lesson_states from DATA', () => {
      expect(component.academic_level).toBeDefined();
      expect(component.lesson_states).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete filter workflow', () => {
      component.selectedStates = ['proposed'];
      component.selectedAreas = ['Mathematics'];
      component.selectedLevels = ['garden'];
      component.filter.setValue('test');

      const mockFilteredLessons = {
        lessons: [
          { 
            ...mockLesson, 
            title: 'Test Mathematics Lesson',
            state: 'proposed',
            knowledge_area: [{ name: 'Mathematics' }],
            development_level: 'garden'
          }
        ]
      };

      lessonService.getAllLessons.and.returnValue(of(mockFilteredLessons));

      component.fetchAllLessons();

      expect(component.allLessons).toEqual(mockFilteredLessons.lessons);
    });

    it('should handle component lifecycle correctly', () => {
      spyOn(component.unsubscribe$, 'next');
      spyOn(component.unsubscribe$, 'complete');

      component.ngOnInit();
      component.ngOnDestroy();

      expect(component.unsubscribe$.next).toHaveBeenCalled();
      expect(component.unsubscribe$.complete).toHaveBeenCalled();
    });
  });
});