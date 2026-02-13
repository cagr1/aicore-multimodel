// .NET (C#) Detector
import fs from 'fs';
import path from 'path';

/**
 * Detect .NET/C# project
 * @param {string} projectPath 
 * @returns {Object|null}
 */
export function detect(projectPath) {
  const files = fs.readdirSync(projectPath);
  
  // Check for .NET specific files
  const hasCsproj = files.some(f => f.endsWith('.csproj'));
  const hasSln = files.some(f => f.endsWith('.sln'));
  const hasProgramCs = files.includes('Program.cs');
  const hasGlobalJson = files.includes('global.json');
  
  // Check for ASP.NET Core files
  const hasStartup = files.includes('Startup.cs');
  const hasStartupCs = files.includes('Startup.cs');
  const hasProgramCs2 = files.includes('Program.cs');
  
  if (!hasCsproj && !hasSln && !hasProgramCs && !hasGlobalJson) {
    return null;
  }

  const signals = [];
  const capabilities = [];
  let framework = null;

  signals.push('csharp');
  signals.push('dotnet');

  // Determine framework type
  if (hasGlobalJson) {
    framework = 'dotnet';
    signals.push('dotnet');
  }
  
  // Check csproj for framework
  const csprojFile = files.find(f => f.endsWith('.csproj'));
  if (csprojFile) {
    try {
      const content = fs.readFileSync(path.join(projectPath, csprojFile), 'utf-8');
      
      if (content.includes('Microsoft.AspNetCore')) {
        framework = framework || 'aspnet';
        signals.push('aspnet');
        
        if (content.includes('Microsoft.AspNetCore.Mvc')) {
          signals.push('mvc');
        }
        if (content.includes('Microsoft.AspNetCore.Blazor')) {
          signals.push('blazor');
        }
      }
      
      if (content.includes('Microsoft.NET.Sdk.BlazorWebAssembly')) {
        framework = 'blazor-wasm';
        signals.push('blazor-wasm');
      }
      
      if (content.includes('Microsoft.NET.Sdk.Web')) {
        framework = 'aspnet';
      }
      
      if (content.includes('Microsoft.NET.Sdk')) {
        if (!framework) {
          framework = 'dotnet';
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Check for API detection
  if (framework === 'aspnet' || files.includes('Controllers') || files.some(f => f.includes('Controller'))) {
    capabilities.push('api');
    signals.push('api');
  }
  
  // Check for Razor Pages
  if (files.includes('Pages') || hasStartup) {
    signals.push('razor');
  }

  return {
    language: 'csharp',
    framework,
    signals,
    capabilities
  };
}

export default { detect };
