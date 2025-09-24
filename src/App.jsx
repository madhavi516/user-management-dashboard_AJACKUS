import React, { useEffect, useState, useMemo } from "react";

const apiBase = "https://jsonplaceholder.typicode.com";

function splitName(name) {
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.trim().split(" ");
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" };
}
function joinName(first, last) { return `${first.trim()}${last.trim() ? " " + last.trim() : ""}`.trim(); }
function validateUserPayload(payload) {
  const errors = {};
  if (!payload.firstName || payload.firstName.trim().length < 2) errors.firstName = "First name must be at least 2 characters";
  if (!payload.lastName || payload.lastName.trim().length < 1) errors.lastName = "Last name is required";
  if (!payload.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) errors.email = "Valid email is required";
  if (!payload.department || payload.department.trim().length < 2) errors.department = "Department must be at least 2 characters";
  return errors;
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState({ key: "id", dir: "asc" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ firstName: "", lastName: "", email: "", department: "" });

  const perPageOptions = [10, 25, 50, 100];
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", department: "" });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`${apiBase}/users`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => setUsers(data.map(u => ({ id: u.id, firstName: splitName(u.name).firstName, lastName: splitName(u.name).lastName, email: u.email, department: (u.company && u.company.name) || "" }))))
      .catch(err => setError(err.message || "Failed to fetch users")).finally(() => setLoading(false));
  }, []);

  const processed = useMemo(() => {
    let list = [...users];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(u => u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.department || "").toLowerCase().includes(q));
    }
    if (filters.firstName.trim()) list = list.filter(u => u.firstName.toLowerCase().includes(filters.firstName.toLowerCase()));
    if (filters.lastName.trim()) list = list.filter(u => u.lastName.toLowerCase().includes(filters.lastName.toLowerCase()));
    if (filters.email.trim()) list = list.filter(u => u.email.toLowerCase().includes(filters.email.toLowerCase()));
    if (filters.department.trim()) list = list.filter(u => (u.department || "").toLowerCase().includes(filters.department.toLowerCase()));
    list.sort((a,b) => {
      const { key, dir } = sortBy; let A = a[key]; let B = b[key]; if (typeof A === 'string') A = A.toLowerCase(); if (typeof B === 'string') B = B.toLowerCase(); if (A < B) return dir === 'asc' ? -1 : 1; if (A > B) return dir === 'asc' ? 1 : -1; return 0;
    });
    return list;
  }, [users, search, filters, sortBy]);

  const total = processed.length; const totalPages = Math.max(1, Math.ceil(total / perPage));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages]);
  const pageSlice = useMemo(() => { const start = (page - 1) * perPage; return processed.slice(start, start + perPage); }, [processed, page, perPage]);

  function openAdd() { setEditingUser(null); setFormData({ firstName: "", lastName: "", email: "", department: "" }); setFormErrors({}); setFormOpen(true); }
  function openEdit(user) { setEditingUser(user); setFormData({ firstName: user.firstName, lastName: user.lastName, email: user.email, department: user.department }); setFormErrors({}); setFormOpen(true); }
  function closeForm() { if (formSubmitting) return; setFormOpen(false); setEditingUser(null); setFormErrors({}); }

  async function submitForm(e) {
    e && e.preventDefault(); const payload = { ...formData }; const errors = validateUserPayload(payload); setFormErrors(errors); if (Object.keys(errors).length) return; setFormSubmitting(true);
    try {
      if (editingUser) {
        const body = { id: editingUser.id, name: joinName(payload.firstName, payload.lastName), email: payload.email, company: { name: payload.department } };
        const res = await fetch(`${apiBase}/users/${editingUser.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!res.ok) throw new Error(`Update failed: ${res.status}`);
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...payload } : u));
      } else {
        const body = { name: joinName(payload.firstName, payload.lastName), email: payload.email, company: { name: payload.department } };
        const res = await fetch(`${apiBase}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!res.ok) throw new Error(`Create failed: ${res.status}`);
        const resp = await res.json(); const newItem = { id: resp.id || Date.now(), ...payload };
        setUsers(prev => [newItem, ...prev]);
      }
      setFormOpen(false); setEditingUser(null);
    } catch (err) { setFormErrors({ submit: err.message || 'Failed to submit' }); }
    finally { setFormSubmitting(false); }
  }

  async function deleteUser(user) { if (!window.confirm(`Delete user ${user.firstName} ${user.lastName} (id=${user.id})?`)) return; try { const res = await fetch(`${apiBase}/users/${user.id}`, { method: 'DELETE' }); if (!res.ok) throw new Error(`Delete failed: ${res.status}`); setUsers(prev => prev.filter(u => u.id !== user.id)); } catch (err) { alert(err.message || 'Failed to delete user'); } }

  function toggleSort(key) { setSortBy(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }); }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">User Management Dashboard</h1>
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={openAdd}>+ Add User</button>
            <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => setFiltersOpen(v => !v)}>Filters</button>
          </div>
        </header>

        <section className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-2">
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, email or department" className="px-3 py-2 border rounded w-72" />
              <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} className="px-2 py-2 border rounded">{perPageOptions.map(o => <option key={o} value={o}>{o} / page</option>)}</select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Sort:</label>
              <select value={`${sortBy.key}_${sortBy.dir}`} onChange={e => { const [key, dir] = e.target.value.split('_'); setSortBy({ key, dir }); }} className="px-2 py-2 border rounded">
                <option value="id_asc">ID ↑</option>
                <option value="id_desc">ID ↓</option>
                <option value="firstName_asc">First ↑</option>
                <option value="firstName_desc">First ↓</option>
                <option value="lastName_asc">Last ↑</option>
                <option value="lastName_desc">Last ↓</option>
                <option value="email_asc">Email ↑</option>
                <option value="email_desc">Email ↓</option>
              </select>
            </div>
          </div>

          {filtersOpen && (
            <div className="mt-3 p-3 bg-white border rounded shadow">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input placeholder="Filter first name" value={filters.firstName} onChange={e => setFilters(f => ({ ...f, firstName: e.target.value }))} className="px-2 py-2 border rounded" />
                <input placeholder="Filter last name" value={filters.lastName} onChange={e => setFilters(f => ({ ...f, lastName: e.target.value }))} className="px-2 py-2 border rounded" />
                <input placeholder="Filter email" value={filters.email} onChange={e => setFilters(f => ({ ...f, email: e.target.value }))} className="px-2 py-2 border rounded" />
                <input placeholder="Filter department" value={filters.department} onChange={e => setFilters(f => ({ ...f, department: e.target.value }))} className="px-2 py-2 border rounded" />
              </div>
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => { setFiltersOpen(false); setPage(1); }}>Apply</button>
                <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => setFilters({ firstName: '', lastName: '', email: '', department: '' })}>Clear</button>
              </div>
            </div>
          )}
        </section>

        <main>
          <div className="bg-white border rounded shadow overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 cursor-pointer" onClick={() => toggleSort('id')}>ID {sortBy.key === 'id' ? (sortBy.dir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2 cursor-pointer" onClick={() => toggleSort('firstName')}>First Name {sortBy.key === 'firstName' ? (sortBy.dir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2 cursor-pointer" onClick={() => toggleSort('lastName')}>Last Name {sortBy.key === 'lastName' ? (sortBy.dir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2 cursor-pointer" onClick={() => toggleSort('email')}>Email {sortBy.key === 'email' ? (sortBy.dir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (<tr><td colSpan={6} className="px-3 py-6 text-center">Loading...</td></tr>)}
                {!loading && pageSlice.length === 0 && (<tr><td colSpan={6} className="px-3 py-6 text-center">No users found.</td></tr>)}
                {!loading && pageSlice.map(u => (
                  <tr key={u.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 align-top">{u.id}</td>
                    <td className="px-3 py-2 align-top">{u.firstName}</td>
                    <td className="px-3 py-2 align-top">{u.lastName}</td>
                    <td className="px-3 py-2 align-top">{u.email}</td>
                    <td className="px-3 py-2 align-top">{u.department}</td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex gap-2">
                        <button className="px-2 py-1 bg-yellow-400 rounded" onClick={() => openEdit(u)}>Edit</button>
                        <button className="px-2 py-1 bg-red-500 text-white rounded" onClick={() => deleteUser(u)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm">Showing {Math.min(total, (page-1)*perPage + 1)} - {Math.min(total, page*perPage)} of {total} users</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 border rounded" onClick={() => setPage(1)} disabled={page===1}>First</button>
              <button className="px-2 py-1 border rounded" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>Prev</button>
              <span>Page</span>
              <input type="number" min={1} max={totalPages} value={page} onChange={e => setPage(Number(e.target.value || 1))} className="w-16 px-2 py-1 border rounded" />
              <span> / {totalPages}</span>
              <button className="px-2 py-1 border rounded" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}>Next</button>
              <button className="px-2 py-1 border rounded" onClick={() => setPage(totalPages)} disabled={page===totalPages}>Last</button>
            </div>
          </div>
        </main>

        {formOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">{editingUser ? `Edit user ${editingUser.id}` : 'Add new user'}</h2>
              <form onSubmit={submitForm} className="grid grid-cols-1 gap-2">
                <div className="grid md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm">First name</label>
                    <input value={formData.firstName} onChange={e => setFormData(d => ({ ...d, firstName: e.target.value }))} className="w-full px-2 py-2 border rounded" />
                    {formErrors.firstName && <p className="text-red-600 text-sm">{formErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="text-sm">Last name</label>
                    <input value={formData.lastName} onChange={e => setFormData(d => ({ ...d, lastName: e.target.value }))} className="w-full px-2 py-2 border rounded" />
                    {formErrors.lastName && <p className="text-red-600 text-sm">{formErrors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-sm">Email</label>
                  <input value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} className="w-full px-2 py-2 border rounded" />
                  {formErrors.email && <p className="text-red-600 text-sm">{formErrors.email}</p>}
                </div>
                <div>
                  <label className="text-sm">Department</label>
                  <input value={formData.department} onChange={e => setFormData(d => ({ ...d, department: e.target.value }))} className="w-full px-2 py-2 border rounded" />
                  {formErrors.department && <p className="text-red-600 text-sm">{formErrors.department}</p>}
                </div>
                {formErrors.submit && <p className="text-red-600">{formErrors.submit}</p>}
                <div className="flex gap-2 justify-end mt-2">
                  <button type="button" onClick={closeForm} className="px-3 py-2 border rounded">Cancel</button>
                  <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded" disabled={formSubmitting}>{formSubmitting ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {error && (<div className="mt-4 p-3 bg-red-100 border rounded text-red-700">Error: {error}</div>)}

        <footer className="mt-6 text-sm text-gray-600">Note: data changes are simulated using JSONPlaceholder API.</footer>
      </div>
    </div>
  );
}
