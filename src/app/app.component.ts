import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-container">
      <header class="app-header">
        <h1>🎯 进程调度算法教学模拟工具</h1>
        <nav class="nav-tabs">
          <a routerLink="/simulator" routerLinkActive="active">模拟器</a>
          <a routerLink="/levels" routerLinkActive="active">教学关卡</a>
        </nav>
      </header>
      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f5f7fa;
    }
    
    .app-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    
    .app-header h1 {
      margin: 0 0 12px 0;
      font-size: 24px;
      font-weight: 600;
    }
    
    .nav-tabs {
      display: flex;
      gap: 8px;
    }
    
    .nav-tabs a {
      padding: 8px 20px;
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      border-radius: 6px 6px 0 0;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .nav-tabs a:hover {
      background: rgba(255,255,255,0.15);
      color: white;
    }
    
    .nav-tabs a.active {
      background: #f5f7fa;
      color: #667eea;
      font-weight: 600;
    }
    
    .app-main {
      flex: 1;
      padding: 16px;
    }
  `]
})
export class AppComponent {
  title = '进程调度算法教学模拟工具';
}
