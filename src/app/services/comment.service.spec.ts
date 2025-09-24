import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CommentService } from './comment.service';

describe('CommentService', () => {
  let service: CommentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CommentService]
    });
    service = TestBed.inject(CommentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Token Validation', () => {
    it('should reject null token in addComment', () => {
      // Arrange
      const comment = { text: 'Test comment', publication: '123' };

      // Act & Assert
      service.addComment(null, comment).subscribe({
        error: (error) => {
          expect(error).toBe('No hay token de autenticación. Por favor, inicie sesión nuevamente.');
        }
      });
    });

    it('should reject empty token in addComment', () => {
      // Arrange
      const comment = { text: 'Test comment', publication: '123' };

      // Act & Assert
      service.addComment('', comment).subscribe({
        error: (error) => {
          expect(error).toBe('No hay token de autenticación. Por favor, inicie sesión nuevamente.');
        }
      });
    });

    it('should reject whitespace-only token in addComment', () => {
      // Arrange
      const comment = { text: 'Test comment', publication: '123' };

      // Act & Assert
      service.addComment('   ', comment).subscribe({
        error: (error) => {
          expect(error).toBe('No hay token de autenticación. Por favor, inicie sesión nuevamente.');
        }
      });
    });

    it('should accept valid token in addComment', () => {
      // Arrange
      const validToken = 'valid-token-123';
      const comment = { text: 'Test comment', publication: '123' };

      // Act
      service.addComment(validToken, comment).subscribe(response => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(service.url + 'comment');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(validToken);
      req.flush({ success: true });
    });
  });

  describe('API Methods', () => {
    const validToken = 'valid-token-123';

    it('should add comment with valid token', () => {
      // Arrange
      const comment = { text: 'Test comment', publication: '123' };

      // Act
      service.addComment(validToken, comment).subscribe(response => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(service.url + 'comment');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(validToken);
      expect(req.request.body).toEqual(comment);
      req.flush({ success: true });
    });

    it('should update comment with valid token', () => {
      // Arrange
      const commentId = '123';

      // Act
      service.updateComment(validToken, commentId).subscribe(response => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(service.url + 'comment/' + commentId);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Authorization')).toBe(validToken);
      req.flush({ success: true });
    });

    it('should remove comment with valid token', () => {
      // Arrange
      const commentId = '123';

      // Act
      service.removeComment(validToken, commentId).subscribe(response => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(service.url + 'comment/' + commentId);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Authorization')).toBe(validToken);
      req.flush({ success: true });
    });

    it('should toggle like comment with valid token', () => {
      // Arrange
      const commentId = '123';

      // Act
      service.toggleLikeComment(validToken, commentId).subscribe(response => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(service.url + 'comment-like/' + commentId);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(validToken);
      req.flush({ success: true });
    });

    it('should get comment likes with valid token', () => {
      // Arrange
      const commentId = '123';

      // Act
      service.getCommentLikes(validToken, commentId).subscribe(response => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(service.url + 'comment-likes/' + commentId);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(validToken);
      req.flush({ likes: [] });
    });

    it('should add reply with valid token', () => {
      // Arrange
      const parentCommentId = '123';
      const reply = { text: 'Test reply' };

      // Act
      service.addReply(validToken, parentCommentId, reply).subscribe(response => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(service.url + 'comment/' + parentCommentId + '/reply');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(validToken);
      expect(req.request.body).toEqual(reply);
      req.flush({ success: true });
    });

    it('should get replies with valid token', () => {
      // Arrange
      const commentId = '123';

      // Act
      service.getReplies(validToken, commentId).subscribe(response => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(service.url + 'comment/' + commentId + '/replies');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(validToken);
      req.flush({ replies: [] });
    });
  });

  describe('Error Handling', () => {
    it('should handle null token in all methods', () => {
      const methods = [
        () => service.addComment(null, { text: 'test' }),
        () => service.updateComment(null, '123'),
        () => service.removeComment(null, '123'),
        () => service.toggleLikeComment(null, '123'),
        () => service.getCommentLikes(null, '123'),
        () => service.addReply(null, '123', { text: 'test' }),
        () => service.getReplies(null, '123')
      ];

      methods.forEach(method => {
        method().subscribe({
          error: (error) => {
            expect(error).toBe('No hay token de autenticación. Por favor, inicie sesión nuevamente.');
          }
        });
      });
    });

    it('should handle empty token in all methods', () => {
      const methods = [
        () => service.addComment('', { text: 'test' }),
        () => service.updateComment('', '123'),
        () => service.removeComment('', '123'),
        () => service.toggleLikeComment('', '123'),
        () => service.getCommentLikes('', '123'),
        () => service.addReply('', '123', { text: 'test' }),
        () => service.getReplies('', '123')
      ];

      methods.forEach(method => {
        method().subscribe({
          error: (error) => {
            expect(error).toBe('No hay token de autenticación. Por favor, inicie sesión nuevamente.');
          }
        });
      });
    });
  });

  describe('Header Management', () => {
    it('should not include Authorization header when token is null', () => {
      // Arrange
      const comment = { text: 'Test comment', publication: '123' };

      // Act
      service.addComment(null, comment).subscribe({
        error: (error) => {
          // Expected error
        }
      });

      // Assert - No debería hacer request HTTP cuando token es null
      httpMock.expectNone(service.url + 'comment');
    });

    it('should include Authorization header when token is valid', () => {
      // Arrange
      const validToken = 'valid-token-123';
      const comment = { text: 'Test comment', publication: '123' };

      // Act
      service.addComment(validToken, comment).subscribe();

      // Assert
      const req = httpMock.expectOne(service.url + 'comment');
      expect(req.request.headers.get('Authorization')).toBe(validToken);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush({ success: true });
    });
  });
}); 