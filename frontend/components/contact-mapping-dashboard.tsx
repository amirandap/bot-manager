"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Users, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface ContactMapping {
  externalsource: string;
  externalid: string;
  phonenumber: string;
  created_at: string;
  updated_at: string;
}

interface UnknownContact {
  externalsource: string;
  externalid: string;
  first_seen: string;
  last_seen: string;
  attempt_count: number;
  status: 'pending' | 'resolved' | 'ignored';
}

interface ContactStats {
  totalMappings: number;
  unknownPending: number;
  unknownResolved: number;
  uniqueSources: number;
  dbPath: string;
  health: { healthy: boolean };
}

export default function ContactMappingDashboard() {
  const [mappings, setMappings] = useState<ContactMapping[]>([]);
  const [unknownContacts, setUnknownContacts] = useState<UnknownContact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Form states
  const [newMapping, setNewMapping] = useState({
    externalsource: "",
    externalid: "",
    phonenumber: ""
  });

  const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://wapi.softgrouprd.com' 
    : 'http://localhost:3001';

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    try {
      const [mappingsRes, unknownRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/contacts/mappings`),
        fetch(`${API_BASE}/api/contacts/unknown`),
        fetch(`${API_BASE}/api/contacts/stats`)
      ]);

      if (mappingsRes.ok) {
        const mappingsData = await mappingsRes.json();
        setMappings(mappingsData.data?.mappings || []);
      }

      if (unknownRes.ok) {
        const unknownData = await unknownRes.json();
        setUnknownContacts(unknownData.data?.unknownContacts || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMapping = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/contacts/mappings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMapping),
      });

      if (response.ok) {
        toast.success('Mapping agregado exitosamente');
        setShowAddDialog(false);
        setNewMapping({ externalsource: "", externalid: "", phonenumber: "" });
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al agregar mapping');
      }
    } catch (error) {
      console.error('Error adding mapping:', error);
      toast.error('Error al agregar mapping');
    }
  };

  const handleDeleteMapping = async (externalsource: string, externalid: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este mapping?')) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/contacts/mappings/${encodeURIComponent(externalsource)}/${encodeURIComponent(externalid)}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast.success('Mapping eliminado exitosamente');
        loadData();
      } else {
        toast.error('Error al eliminar mapping');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast.error('Error al eliminar mapping');
    }
  };

  const handleCreateMappingFromUnknown = (unknown: UnknownContact) => {
    setNewMapping({
      externalsource: unknown.externalsource,
      externalid: unknown.externalid,
      phonenumber: ""
    });
    setShowAddDialog(true);
  };

  const filteredMappings = mappings.filter(mapping => {
    const matchesSearch = 
      mapping.externalid.toLowerCase().includes(searchFilter.toLowerCase()) ||
      mapping.phonenumber.includes(searchFilter) ||
      mapping.externalsource.toLowerCase().includes(searchFilter.toLowerCase());
    
    const matchesSource = sourceFilter === "all" || mapping.externalsource === sourceFilter;
    
    return matchesSearch && matchesSource;
  });

  const uniqueSources = Array.from(new Set(mappings.map(m => m.externalsource)));

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mappings</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMappings}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unknownPending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resueltos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unknownResolved}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sources</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueSources}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Unknown Contacts Section */}
      {unknownContacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Contactos Desconocidos Pendientes ({unknownContacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unknownContacts.map((contact, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                  <div>
                    <p className="font-medium">{contact.externalid}</p>
                    <p className="text-sm text-gray-600">
                      Source: {contact.externalsource} | 
                      Intentos: {contact.attempt_count} | 
                      Visto: {new Date(contact.first_seen).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleCreateMappingFromUnknown(contact)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Mapear
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Mappings Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Contact Mappings ({filteredMappings.length})</CardTitle>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Mapping
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Mapping</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="externalsource">External Source</Label>
                    <Input
                      id="externalsource"
                      value={newMapping.externalsource}
                      onChange={(e) => setNewMapping({...newMapping, externalsource: e.target.value})}
                      placeholder="ej: trellousername"
                    />
                  </div>
                  <div>
                    <Label htmlFor="externalid">External ID</Label>
                    <Input
                      id="externalid"
                      value={newMapping.externalid}
                      onChange={(e) => setNewMapping({...newMapping, externalid: e.target.value})}
                      placeholder="ej: @usuario123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phonenumber">Número de Teléfono</Label>
                    <Input
                      id="phonenumber"
                      value={newMapping.phonenumber}
                      onChange={(e) => setNewMapping({...newMapping, phonenumber: e.target.value})}
                      placeholder="ej: +18095551234"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddMapping}>
                      Agregar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por ID, teléfono o source..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los sources</SelectItem>
                {uniqueSources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>External Source</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>Número de Teléfono</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMappings.map((mapping, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Badge variant="secondary">{mapping.externalsource}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">{mapping.externalid}</TableCell>
                  <TableCell className="font-mono">{mapping.phonenumber}</TableCell>
                  <TableCell>{new Date(mapping.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMapping(mapping.externalsource, mapping.externalid)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredMappings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron mappings con los filtros actuales
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}