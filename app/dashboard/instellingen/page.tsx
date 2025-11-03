'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { Settings, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface UserPreferences {
  // Algemene voorkeuren
  theme?: string;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  // Dashboard voorkeuren
  dashboardLayout?: string;
  itemsPerPage?: number;
  defaultDashboardSection?: string;
  // Kaart voorkeuren
  mapSettings?: string;
  // Notificatie voorkeuren
  emailNotifications?: boolean;
  notificationPreferences?: string;
  // Filter voorkeuren
  defaultFilters?: string;
  // Sortering voorkeuren
  defaultSorting?: string;
  // AI voorkeuren
  aiAutoAnalysis?: boolean;
  defaultAIModel?: string;
  showAISuggestions?: boolean;
  autoGenerateToolbox?: boolean;
  // Organisatie voorkeuren
  defaultOrganizationId?: number;
  // Weergave voorkeuren
  compactMode?: boolean;
  autoRefresh?: boolean;
  autoRefreshInterval?: number;
}

const themes = [
  { name: "Slate", value: "theme-slate", icon: "🌑" },
  { name: "Ocean", value: "theme-ocean", icon: "🌊" },
  { name: "Forest", value: "theme-forest", icon: "🌲" },
  { name: "Purple", value: "theme-purple", icon: "💜" },
  { name: "Rose", value: "theme-rose", icon: "🌹" },
  { name: "Amber", value: "theme-amber", icon: "🟡" },
  { name: "Light", value: "light", icon: "☀️" },
];

const languages = [
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
];

const timezones = [
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
  { value: 'Europe/Brussels', label: 'Brussel (CET)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'UTC', label: 'UTC' },
];

const dateFormats = [
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
];

const dashboardLayouts = [
  { value: 'compact', label: 'Compact' },
  { value: 'standard', label: 'Standaard' },
  { value: 'detailed', label: 'Uitgebreid' },
];

const aiModels = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

export default function InstellingenPage() {
  const { user, isLoaded } = useUser();
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'algemeen' | 'dashboard' | 'kaart' | 'notificaties' | 'projecten' | 'ai'>('algemeen');

  // Map settings state
  const [mapSettings, setMapSettings] = useState({
    defaultZoom: 8,
    center: [52.3676, 5.2],
    showProjects: true,
    showIncidents: true,
    mapStyle: 'osm',
  });

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailIncidents: true,
    emailProjects: true,
    emailAI: true,
    dailySummary: false,
    weeklySummary: false,
    criticalAlerts: true,
  });

  useEffect(() => {
    if (isLoaded && user) {
      loadPreferences();
    }
  }, [isLoaded, user]);

  const loadPreferences = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        const prefs = data.preferences || {};
        // Convert null defaultDashboardSection to 'none' for the select
        if (prefs.defaultDashboardSection === null || prefs.defaultDashboardSection === undefined) {
          prefs.defaultDashboardSection = 'none';
        }
        setPreferences(prefs);

        // Parse JSON settings
        if (prefs.mapSettings) {
          try {
            setMapSettings(JSON.parse(prefs.mapSettings));
          } catch (e) {
            // Use defaults
          }
        }

        if (prefs.notificationPreferences) {
          try {
            setNotificationPrefs(JSON.parse(prefs.notificationPreferences));
          } catch (e) {
            // Use defaults
          }
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setSaveStatus('idle');

    try {
      const updateData: any = {
        theme: preferences?.theme || theme,
        language: preferences?.language || 'nl',
        timezone: preferences?.timezone || 'Europe/Amsterdam',
        dateFormat: preferences?.dateFormat || 'DD-MM-YYYY',
        timeFormat: preferences?.timeFormat || '24h',
        dashboardLayout: preferences?.dashboardLayout || 'standard',
        itemsPerPage: preferences?.itemsPerPage || 25,
        defaultDashboardSection: (preferences?.defaultDashboardSection === 'none' || !preferences?.defaultDashboardSection) ? null : preferences.defaultDashboardSection,
        mapSettings: JSON.stringify(mapSettings),
        emailNotifications: preferences?.emailNotifications ?? true,
        notificationPreferences: JSON.stringify(notificationPrefs),
        defaultFilters: preferences?.defaultFilters || null,
        defaultSorting: preferences?.defaultSorting || null,
        aiAutoAnalysis: preferences?.aiAutoAnalysis ?? false,
        defaultAIModel: preferences?.defaultAIModel || 'gpt-4',
        showAISuggestions: preferences?.showAISuggestions ?? true,
        autoGenerateToolbox: preferences?.autoGenerateToolbox ?? false,
        defaultOrganizationId: preferences?.defaultOrganizationId || null,
        compactMode: preferences?.compactMode ?? false,
        autoRefresh: preferences?.autoRefresh ?? true,
        autoRefreshInterval: preferences?.autoRefreshInterval || 30000,
      };

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        setSaveStatus('success');
        const updated = await res.json();
        setPreferences(updated);
        
        // Update theme if changed
        if (updateData.theme && updateData.theme !== theme) {
          setTheme(updateData.theme);
        }

        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs = [
    { id: 'algemeen', label: 'Algemeen', icon: '⚙️' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'kaart', label: 'Kaart', icon: '🗺️' },
    { id: 'notificaties', label: 'Notificaties', icon: '🔔' },
    { id: 'projecten', label: 'Projecten & Meldingen', icon: '📋' },
    { id: 'ai', label: 'AI & Analyses', icon: '🤖' },
  ];

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Instellingen</h1>
            </div>
            <p className="text-muted-foreground">
              Pas je applicatie voorkeuren aan. Wijzigingen worden automatisch opgeslagen per gebruiker.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-border">
            <div className="flex gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Algemeen Tab */}
            {activeTab === 'algemeen' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Weergave</CardTitle>
                    <CardDescription>Pas het thema en de taal aan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Thema</Label>
                      <Select
                        value={preferences?.theme || theme || 'theme-slate'}
                        onValueChange={(value) => {
                          updatePreference('theme', value);
                          setTheme(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {themes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <span className="mr-2">{t.icon}</span>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Taal</Label>
                      <Select
                        value={preferences?.language || 'nl'}
                        onValueChange={(value) => updatePreference('language', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tijdzone</Label>
                      <Select
                        value={preferences?.timezone || 'Europe/Amsterdam'}
                        onValueChange={(value) => updatePreference('timezone', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Datumformaat</Label>
                        <Select
                          value={preferences?.dateFormat || 'DD-MM-YYYY'}
                          onValueChange={(value) => updatePreference('dateFormat', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {dateFormats.map((format) => (
                              <SelectItem key={format.value} value={format.value}>
                                {format.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Tijdformaat</Label>
                        <Select
                          value={preferences?.timeFormat || '24h'}
                          onValueChange={(value) => updatePreference('timeFormat', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="24h">24-uurs</SelectItem>
                            <SelectItem value="12h">12-uurs (AM/PM)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Weergave Opties</CardTitle>
                    <CardDescription>Extra weergave instellingen</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Compacte modus</Label>
                        <p className="text-sm text-muted-foreground">
                          Kleinere UI-elementen voor meer ruimte
                        </p>
                      </div>
                      <Switch
                        checked={preferences?.compactMode ?? false}
                        onCheckedChange={(checked) => updatePreference('compactMode', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Automatisch verversen</Label>
                        <p className="text-sm text-muted-foreground">
                          Ververs data automatisch in de achtergrond
                        </p>
                      </div>
                      <Switch
                        checked={preferences?.autoRefresh ?? true}
                        onCheckedChange={(checked) => updatePreference('autoRefresh', checked)}
                      />
                    </div>

                    {preferences?.autoRefresh && (
                      <div className="space-y-2">
                        <Label>Verversingsinterval (seconden)</Label>
                        <Input
                          type="number"
                          value={((preferences?.autoRefreshInterval || 30000) / 1000)}
                          onChange={(e) => updatePreference('autoRefreshInterval', parseInt(e.target.value) * 1000)}
                          min={5}
                          max={300}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Dashboard Layout</CardTitle>
                    <CardDescription>Pas de weergave van je dashboard aan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Layout Type</Label>
                      <Select
                        value={preferences?.dashboardLayout || 'standard'}
                        onValueChange={(value) => updatePreference('dashboardLayout', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dashboardLayouts.map((layout) => (
                            <SelectItem key={layout.value} value={layout.value}>
                              {layout.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Items per pagina</Label>
                      <Input
                        type="number"
                        value={preferences?.itemsPerPage || 25}
                        onChange={(e) => updatePreference('itemsPerPage', parseInt(e.target.value))}
                        min={10}
                        max={100}
                      />
                      <p className="text-sm text-muted-foreground">
                        Aantal items dat getoond wordt in tabellen en lijsten
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Standaard Dashboard Sectie</Label>
                      <Select
                        value={preferences?.defaultDashboardSection || 'none'}
                        onValueChange={(value) => updatePreference('defaultDashboardSection', value === 'none' ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Geen voorkeur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Geen voorkeur</SelectItem>
                          <SelectItem value="projects">Projecten</SelectItem>
                          <SelectItem value="incidents">Veiligheidsmeldingen</SelectItem>
                          <SelectItem value="analytics">Analyses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Kaart Tab */}
            {activeTab === 'kaart' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Kaart Instellingen</CardTitle>
                    <CardDescription>Configureer je kaartweergave voorkeuren</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Standaard Zoomniveau</Label>
                      <Input
                        type="number"
                        value={mapSettings.defaultZoom}
                        onChange={(e) => setMapSettings({ ...mapSettings, defaultZoom: parseInt(e.target.value) })}
                        min={1}
                        max={18}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Centrum Latitude</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={mapSettings.center[0]}
                          onChange={(e) => setMapSettings({ ...mapSettings, center: [parseFloat(e.target.value), mapSettings.center[1]] })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Centrum Longitude</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={mapSettings.center[1]}
                          onChange={(e) => setMapSettings({ ...mapSettings, center: [mapSettings.center[0], parseFloat(e.target.value)] })}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>Weergeven op kaart</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="show-projects">Projecten</Label>
                          <Switch
                            id="show-projects"
                            checked={mapSettings.showProjects}
                            onCheckedChange={(checked) => setMapSettings({ ...mapSettings, showProjects: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="show-incidents">Incidenten</Label>
                          <Switch
                            id="show-incidents"
                            checked={mapSettings.showIncidents}
                            onCheckedChange={(checked) => setMapSettings({ ...mapSettings, showIncidents: checked })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Kaartstijl</Label>
                      <Select
                        value={mapSettings.mapStyle}
                        onValueChange={(value) => setMapSettings({ ...mapSettings, mapStyle: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="osm">OpenStreetMap</SelectItem>
                          <SelectItem value="satellite">Satelliet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notificaties Tab */}
            {activeTab === 'notificaties' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Notificaties</CardTitle>
                    <CardDescription>Beheer welke notificaties je ontvangt</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notificaties Inschakelen</Label>
                        <p className="text-sm text-muted-foreground">
                          Ontvang email notificaties voor belangrijke gebeurtenissen
                        </p>
                      </div>
                      <Switch
                        checked={preferences?.emailNotifications ?? true}
                        onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
                      />
                    </div>

                    {preferences?.emailNotifications && (
                      <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Email bij nieuwe incidenten</Label>
                            <p className="text-sm text-muted-foreground">
                              Ontvang een email wanneer een nieuw incident wordt gemeld
                            </p>
                          </div>
                          <Switch
                            checked={notificationPrefs.emailIncidents}
                            onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, emailIncidents: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Email bij project updates</Label>
                            <p className="text-sm text-muted-foreground">
                              Ontvang een email bij belangrijke projectwijzigingen
                            </p>
                          </div>
                          <Switch
                            checked={notificationPrefs.emailProjects}
                            onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, emailProjects: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Email bij AI analyses</Label>
                            <p className="text-sm text-muted-foreground">
                              Ontvang een email wanneer een nieuwe AI analyse beschikbaar is
                            </p>
                          </div>
                          <Switch
                            checked={notificationPrefs.emailAI}
                            onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, emailAI: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Kritieke alerts direct</Label>
                            <p className="text-sm text-muted-foreground">
                              Ontvang direct een email voor kritieke incidenten
                            </p>
                          </div>
                          <Switch
                            checked={notificationPrefs.criticalAlerts}
                            onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, criticalAlerts: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Dagelijkse samenvatting</Label>
                            <p className="text-sm text-muted-foreground">
                              Ontvang elke dag een samenvatting van activiteiten
                            </p>
                          </div>
                          <Switch
                            checked={notificationPrefs.dailySummary}
                            onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, dailySummary: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Wekelijkse samenvatting</Label>
                            <p className="text-sm text-muted-foreground">
                              Ontvang elke week een overzicht van activiteiten
                            </p>
                          </div>
                          <Switch
                            checked={notificationPrefs.weeklySummary}
                            onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, weeklySummary: checked })}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Projecten & Meldingen Tab */}
            {activeTab === 'projecten' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Standaard Filters</CardTitle>
                    <CardDescription>Configureer je standaard filter voorkeuren</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Deze functie is beschikbaar in een toekomstige update. Je kunt filters instellen die automatisch worden toegepast bij het openen van projecten en meldingen.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Standaard Sortering</CardTitle>
                    <CardDescription>Configureer je standaard sortering voorkeuren</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Deze functie is beschikbaar in een toekomstige update. Je kunt standaard sortering instellen voor projecten en meldingen.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* AI Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Voorkeuren</CardTitle>
                    <CardDescription>Configureer AI-gerelateerde instellingen</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Standaard AI Model</Label>
                      <Select
                        value={preferences?.defaultAIModel || 'gpt-4'}
                        onValueChange={(value) => updatePreference('defaultAIModel', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {aiModels.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Automatische AI Analyse</Label>
                          <p className="text-sm text-muted-foreground">
                            Voer automatisch AI analyses uit bij nieuwe incidenten
                          </p>
                        </div>
                        <Switch
                          checked={preferences?.aiAutoAnalysis ?? false}
                          onCheckedChange={(checked) => updatePreference('aiAutoAnalysis', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>AI Suggesties Weergeven</Label>
                          <p className="text-sm text-muted-foreground">
                            Toon AI-suggesties en aanbevelingen in de interface
                          </p>
                        </div>
                        <Switch
                          checked={preferences?.showAISuggestions ?? true}
                          onCheckedChange={(checked) => updatePreference('showAISuggestions', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Automatisch Toolbox Genereren</Label>
                          <p className="text-sm text-muted-foreground">
                            Genereer automatisch toolboxen op basis van AI analyses
                          </p>
                        </div>
                        <Switch
                          checked={preferences?.autoGenerateToolbox ?? false}
                          onCheckedChange={(checked) => updatePreference('autoGenerateToolbox', checked)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-between pt-6 border-t border-border">
              <div className="flex items-center gap-2">
                {saveStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">Instellingen opgeslagen!</span>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Fout bij opslaan. Probeer opnieuw.</span>
                  </div>
                )}
              </div>
              <Button onClick={savePreferences} disabled={saving} size="lg">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Wijzigingen Opslaan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

