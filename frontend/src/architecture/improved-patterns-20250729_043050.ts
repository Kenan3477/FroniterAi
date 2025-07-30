// 🏗️ Architecture Improvement - Auto-generated
// 📅 Created: 2025-07-29T04:30:50.373388

// Dependency Injection Container
export class DIContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();
  
  register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }
  
  registerFactory<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }
  
  resolve<T>(name: string): T {
    if (this.services.has(name)) {
      return this.services.get(name);
    }
    
    if (this.factories.has(name)) {
      const instance = this.factories.get(name)!();
      this.services.set(name, instance);
      return instance;
    }
    
    throw new Error(`Service ${name} not found`);
  }
}

// Event Bus for decoupled communication
export class EventBus {
  private events = new Map<string, Function[]>();
  
  on(event: string, callback: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }
  
  emit(event: string, data?: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
  
  off(event: string, callback: Function): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

// Repository Pattern for data access
export abstract class Repository<T> {
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract create(entity: Omit<T, 'id'>): Promise<T>;
  abstract update(id: string, entity: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
}

// Use Case Pattern for business logic
export abstract class UseCase<TRequest, TResponse> {
  abstract execute(request: TRequest): Promise<TResponse>;
}

// Error handling improvements
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

// Factory Pattern for complex object creation
export abstract class Factory<T> {
  abstract create(config: any): T;
}

// Observer Pattern for reactive updates
export interface Observer<T> {
  update(data: T): void;
}

export class Subject<T> {
  private observers: Observer<T>[] = [];
  
  subscribe(observer: Observer<T>): void {
    this.observers.push(observer);
  }
  
  unsubscribe(observer: Observer<T>): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }
  
  notify(data: T): void {
    this.observers.forEach(observer => observer.update(data));
  }
}

// Global architecture instance
export const container = new DIContainer();
export const eventBus = new EventBus();
