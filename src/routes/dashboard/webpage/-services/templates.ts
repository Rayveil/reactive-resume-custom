/**
 * Handlebars templates for different webpage styles
 */

export function moderneTemplate(): string {
  return `
<div class="min-h-screen bg-white">
  <!-- Header -->
  <header class="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 py-12">
    <div class="max-w-4xl mx-auto px-6">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">{{fullName}}</h1>
      <p class="text-xl text-gray-600 mb-4">{{summary}}</p>
      
      <div class="flex flex-wrap gap-4 text-sm text-gray-600">
        {{#if email}}<span>📧 {{email}}</span>{{/if}}
        {{#if phone}}<span>📱 {{phone}}</span>{{/if}}
        {{#if location}}<span>📍 {{location}}</span>{{/if}}
        {{#if website}}<span>🌐 <a href="{{website}}" target="_blank">{{website}}</a></span>{{/if}}
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 py-12">
    <!-- Experience -->
    {{#if experience}}
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-blue-500">
        Work Experience
      </h2>
      <div class="space-y-8">
        {{#each experience}}
        <div class="fade-in">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-lg font-semibold text-gray-900">{{this.jobTitle}}</h3>
            <span class="text-sm text-gray-500">{{formatDate this.startDate}} - {{formatDate this.endDate}}</span>
          </div>
          <p class="text-blue-600 font-medium mb-2">{{this.company}}</p>
          {{#if this.summary}}<p class="text-gray-700 leading-relaxed">{{this.summary}}</p>{{/if}}
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}

    <!-- Education -->
    {{#if education}}
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-blue-500">
        Education
      </h2>
      <div class="space-y-6">
        {{#each education}}
        <div class="fade-in">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-lg font-semibold text-gray-900">{{this.studyType}} in {{this.fieldOfStudy}}</h3>
            <span class="text-sm text-gray-500">{{this.endDate}}</span>
          </div>
          <p class="text-blue-600 font-medium">{{this.institution}}</p>
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}

    <!-- Skills -->
    {{#if skills}}
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-blue-500">
        Skills
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {{#each skills}}
        <div class="fade-in">
          <h3 class="font-semibold text-gray-900 mb-2">{{this.name}}</h3>
          <div class="flex flex-wrap gap-2">
            {{#each this.keywords}}
            <span class="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
              {{this}}
            </span>
            {{/each}}
          </div>
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}

    <!-- Projects -->
    {{#if projects}}
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-blue-500">
        Projects
      </h2>
      <div class="space-y-6">
        {{#each projects}}
        <div class="fade-in border-l-4 border-blue-500 pl-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-1">{{this.name}}</h3>
          {{#if this.description}}<p class="text-gray-700 mb-2">{{this.description}}</p>{{/if}}
          {{#if this.website}}<p><a href="{{this.website}}" target="_blank" class="text-blue-600 hover:underline">Visit Project →</a></p>{{/if}}
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}

    <!-- Languages -->
    {{#if languages}}
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-blue-500">
        Languages
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {{#each languages}}
        <div class="fade-in">
          <p class="font-medium text-gray-900">{{this.name}}</p>
          <p class="text-sm text-gray-600">{{this.fluency}}</p>
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}
  </main>

  <!-- Footer -->
  <footer class="bg-gray-50 border-t border-gray-200 py-6 mt-12">
    <div class="max-w-4xl mx-auto px-6 text-center text-sm text-gray-600">
      <p>Generated with <span class="font-medium">Reactive Resume</span> • {{generatedAt}}</p>
    </div>
  </footer>
</div>
  `;
}

export function professionalTemplate(): string {
  return `
<div class="min-h-screen bg-gray-50">
  <div class="max-w-5xl mx-auto">
    <!-- Sidebar -->
    <div class="flex">
      <div class="w-64 bg-gray-900 text-white p-12 min-h-screen">
        <h1 class="text-3xl font-bold mb-2">{{fullName}}</h1>
        <p class="text-gray-300 text-sm mb-8">{{summary}}</p>

        <!-- Contact Info -->
        <div class="space-y-4 mb-12 border-t border-gray-700 pt-8">
          {{#if email}}<div class="text-sm"><span class="text-gray-400">Email</span><p class="font-medium">{{email}}</p></div>{{/if}}
          {{#if phone}}<div class="text-sm"><span class="text-gray-400">Phone</span><p class="font-medium">{{phone}}</p></div>{{/if}}
          {{#if location}}<div class="text-sm"><span class="text-gray-400">Location</span><p class="font-medium">{{location}}</p></div>{{/if}}
          {{#if website}}<div class="text-sm"><span class="text-gray-400">Website</span><p class="font-medium"><a href="{{website}}" target="_blank" class="text-blue-300 hover:text-blue-200">{{website}}</a></p></div>{{/if}}
        </div>

        <!-- Skills (in sidebar) -->
        {{#if skills}}
        <div class="mb-12">
          <h3 class="text-lg font-bold text-white mb-4">Skills</h3>
          <div class="space-y-4">
            {{#each skills}}
            <div>
              <p class="text-white font-medium text-sm mb-1">{{this.name}}</p>
              <div class="flex flex-wrap gap-1">
                {{#each this.keywords}}
                <span class="text-xs bg-gray-700 px-2 py-1 rounded">{{this}}</span>
                {{/each}}
              </div>
            </div>
            {{/each}}
          </div>
        </div>
        {{/if}}

        <!-- Languages -->
        {{#if languages}}
        <div>
          <h3 class="text-lg font-bold text-white mb-4">Languages</h3>
          <div class="space-y-2">
            {{#each languages}}
            <p class="text-sm text-gray-300">{{this.name}} • <span class="text-gray-400">{{this.fluency}}</span></p>
            {{/each}}
          </div>
        </div>
        {{/if}}
      </div>

      <!-- Main Content -->
      <div class="flex-1 bg-white p-12">
        <!-- Experience -->
        {{#if experience}}
        <section class="mb-12">
          <h2 class="text-lg font-bold text-gray-900 mb-6 uppercase tracking-wider border-b-2 border-gray-300 pb-2">
            Experience
          </h2>
          <div class="space-y-8">
            {{#each experience}}
            <div>
              <div class="flex justify-between items-start mb-1">
                <h3 class="text-base font-bold text-gray-900">{{this.jobTitle}}</h3>
                <span class="text-xs text-gray-500">{{formatDate this.startDate}} - {{formatDate this.endDate}}</span>
              </div>
              <p class="text-sm font-semibold text-gray-700 mb-2">{{this.company}}</p>
              {{#if this.summary}}<p class="text-sm text-gray-700 leading-relaxed">{{this.summary}}</p>{{/if}}
            </div>
            {{/each}}
          </div>
        </section>
        {{/if}}

        <!-- Education -->
        {{#if education}}
        <section class="mb-12">
          <h2 class="text-lg font-bold text-gray-900 mb-6 uppercase tracking-wider border-b-2 border-gray-300 pb-2">
            Education
          </h2>
          <div class="space-y-6">
            {{#each education}}
            <div>
              <h3 class="text-base font-bold text-gray-900">{{this.studyType}} in {{this.fieldOfStudy}}</h3>
              <p class="text-sm font-semibold text-gray-700">{{this.institution}}</p>
              <p class="text-xs text-gray-500">{{this.endDate}}</p>
            </div>
            {{/each}}
          </div>
        </section>
        {{/if}}

        <!-- Projects -->
        {{#if projects}}
        <section>
          <h2 class="text-lg font-bold text-gray-900 mb-6 uppercase tracking-wider border-b-2 border-gray-300 pb-2">
            Projects
          </h2>
          <div class="space-y-4">
            {{#each projects}}
            <div class="pb-4 border-b border-gray-200 last:border-b-0">
              <h3 class="font-bold text-gray-900 text-sm">{{this.name}}</h3>
              {{#if this.description}}<p class="text-sm text-gray-700 mt-1">{{this.description}}</p>{{/if}}
            </div>
            {{/each}}
          </div>
        </section>
        {{/if}}
      </div>
    </div>
  </div>
</div>
  `;
}

export function creativeTemplate(): string {
  return `
<div class="min-h-screen bg-white">
  <!-- Hero Section -->
  <header class="relative overflow-hidden py-20 px-6 bg-gradient-to-br from-purple-600 via-pink-500 to-red-400">
    <div class="max-w-4xl mx-auto relative z-10">
      <h1 class="text-5xl font-black text-white mb-4 tracking-tight">{{fullName}}</h1>
      <p class="text-xl text-white/90 max-w-2xl leading-relaxed">{{summary}}</p>
      
      <div class="flex flex-wrap gap-6 mt-8 text-white text-sm">
        {{#if email}}<span class="flex items-center gap-2">✉️ {{email}}</span>{{/if}}
        {{#if phone}}<span class="flex items-center gap-2">📱 {{phone}}</span>{{/if}}
        {{#if location}}<span class="flex items-center gap-2">📍 {{location}}</span>{{/if}}
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 py-16">
    <!-- Experience -->
    {{#if experience}}
    <section class="mb-20">
      <h2 class="text-3xl font-black text-gray-900 mb-12 relative">
        <span class="inline-block">Work Experience</span>
        <div class="absolute bottom-0 left-0 w-24 h-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full"></div>
      </h2>
      <div class="space-y-12">
        {{#each experience}}
        <div class="border-l-4 border-purple-600 pl-8 relative">
          <div class="absolute -left-3 top-0 w-6 h-6 bg-purple-600 rounded-full"></div>
          <h3 class="text-2xl font-bold text-gray-900 mb-1">{{this.jobTitle}}</h3>
          <p class="text-lg text-pink-600 font-semibold mb-3">{{this.company}}</p>
          <p class="text-sm text-gray-500 mb-3">{{formatDate this.startDate}} - {{formatDate this.endDate}}</p>
          {{#if this.summary}}<p class="text-gray-700 leading-relaxed">{{this.summary}}</p>{{/if}}
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}

    <!-- Education -->
    {{#if education}}
    <section class="mb-20">
      <h2 class="text-3xl font-black text-gray-900 mb-12 relative">
        <span class="inline-block">Education</span>
        <div class="absolute bottom-0 left-0 w-24 h-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full"></div>
      </h2>
      <div class="grid md:grid-cols-2 gap-8">
        {{#each education}}
        <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
          <h3 class="text-lg font-bold text-gray-900 mb-2">{{this.studyType}}</h3>
          <p class="text-purple-600 font-semibold mb-1">{{this.fieldOfStudy}}</p>
          <p class="text-gray-700 mb-2">{{this.institution}}</p>
          <p class="text-sm text-gray-500">{{this.endDate}}</p>
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}

    <!-- Skills -->
    {{#if skills}}
    <section class="mb-20">
      <h2 class="text-3xl font-black text-gray-900 mb-12 relative">
        <span class="inline-block">Skills</span>
        <div class="absolute bottom-0 left-0 w-24 h-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full"></div>
      </h2>
      <div class="grid md:grid-cols-2 gap-8">
        {{#each skills}}
        <div>
          <h3 class="font-bold text-gray-900 mb-4 text-lg">{{this.name}}</h3>
          <div class="flex flex-wrap gap-2">
            {{#each this.keywords}}
            <span class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-full">
              {{this}}
            </span>
            {{/each}}
          </div>
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}

    <!-- Projects -->
    {{#if projects}}
    <section class="mb-20">
      <h2 class="text-3xl font-black text-gray-900 mb-12 relative">
        <span class="inline-block">Projects</span>
        <div class="absolute bottom-0 left-0 w-24 h-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full"></div>
      </h2>
      <div class="space-y-6">
        {{#each projects}}
        <div class="group bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-purple-600 transition-colors">
          <h3 class="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors mb-2">{{this.name}}</h3>
          {{#if this.description}}<p class="text-gray-700 mb-4">{{this.description}}</p>{{/if}}
          {{#if this.website}}<a href="{{this.website}}" target="_blank" class="text-purple-600 font-semibold hover:text-pink-600">Explore →</a>{{/if}}
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}

    <!-- Languages -->
    {{#if languages}}
    <section>
      <h2 class="text-3xl font-black text-gray-900 mb-12 relative">
        <span class="inline-block">Languages</span>
        <div class="absolute bottom-0 left-0 w-24 h-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full"></div>
      </h2>
      <div class="grid md:grid-cols-3 gap-4">
        {{#each languages}}
        <div class="bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg p-4">
          <p class="font-bold text-gray-900">{{this.name}}</p>
          <p class="text-purple-600 text-sm">{{this.fluency}}</p>
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}
  </main>

  <!-- Footer -->
  <footer class="bg-gray-900 text-white py-8 mt-20">
    <div class="max-w-4xl mx-auto px-6 text-center text-sm text-gray-400">
      <p>Crafted with ✨ using <span class="font-semibold text-white">Reactive Resume</span></p>
    </div>
  </footer>
</div>
  `;
}
