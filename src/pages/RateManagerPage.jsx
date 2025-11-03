import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit, Trash2, Save, X, AlertCircle, TrendingUp } from 'lucide-react';
import RateManagerService from '../services/rateManagerService';
import CategoryService from '../services/categoryService';

const RateManagerPage = ({ isDarkMode = false }) => {
  const [rates, setRates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    categoryId: '',
    doerRate: '',
    checkerRatePerMistake: '',
    effectiveFrom: '',
    effectiveTo: ''
  });

  useEffect(() => {
    loadData();
    
    // Listen for updates
    const handleUpdate = () => {
      setRates(RateManagerService.getAllRates());
    };
    window.addEventListener('ratesUpdated', handleUpdate);
    
    return () => {
      window.removeEventListener('ratesUpdated', handleUpdate);
    };
  }, []);

  const loadData = () => {
    try {
      const ratesData = RateManagerService.getAllRates();
      setRates(Array.isArray(ratesData) ? ratesData : []);
      
      const categoriesData = CategoryService.getAll();
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      
      setError(null);
    } catch (err) {
      console.error('Error loading rate manager data:', err);
      setError(err.message || 'Failed to load data');
      setRates([]);
      setCategories([]);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const handleCreate = () => {
    setEditingRate(null);
    setFormData({
      categoryId: '',
      doerRate: '',
      checkerRatePerMistake: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: ''
    });
    setShowForm(true);
  };

  const handleEdit = (rate) => {
    setEditingRate(rate);
    setFormData({
      categoryId: rate.categoryId,
      doerRate: rate.doerRate,
      checkerRatePerMistake: rate.checkerRatePerMistake,
      effectiveFrom: rate.effectiveFrom,
      effectiveTo: rate.effectiveTo || ''
    });
    setShowForm(true);
  };

  const handleDelete = (rateId) => {
    const result = RateManagerService.deleteRate(rateId);
    if (result.success) {
      loadData();
      setDeleteConfirm(null);
      alert('Rate deleted successfully');
    } else {
      alert(result.message || 'Failed to delete rate');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.categoryId) {
      alert('Please select a category');
      return;
    }
    
    if (!formData.doerRate && formData.doerRate !== 0) {
      alert('Please enter doer rate');
      return;
    }
    
    if (formData.checkerRatePerMistake === '' || formData.checkerRatePerMistake === null) {
      alert('Please enter checker rate per mistake');
      return;
    }

    const result = editingRate
      ? RateManagerService.updateRate(editingRate.id, formData)
      : RateManagerService.createRate(formData);

    if (result.success) {
      loadData();
      setShowForm(false);
      setEditingRate(null);
      alert(editingRate ? 'Rate updated successfully' : 'Rate created successfully');
    } else {
      alert(result.message || 'Failed to save rate');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRate(null);
    setFormData({
      categoryId: '',
      doerRate: '',
      checkerRatePerMistake: '',
      effectiveFrom: '',
      effectiveTo: ''
    });
  };

  if (error) {
    return (
      <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className={`max-w-2xl mx-auto p-6 rounded-xl border-2 ${
          isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-300'
        }`}>
          <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
            Error Loading Rate Manager Data
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
            {error}
          </p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`mb-6 p-5 rounded-xl border-2 ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Rate Manager
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Set category-wise rates for doers and checkers
            </p>
          </div>
          <button
            onClick={handleCreate}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Plus size={20} />
            Add Rate
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border-2 ${
            isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                Total Rates
              </span>
              <DollarSign size={18} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
            </div>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {rates.length}
            </p>
          </div>

          <div className={`p-4 rounded-lg border-2 ${
            isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                Active Rates
              </span>
              <TrendingUp size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {rates.filter(r => r.status === 'active').length}
            </p>
          </div>

          <div className={`p-4 rounded-lg border-2 ${
            isDarkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                Categories Configured
              </span>
              <DollarSign size={18} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
            </div>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {new Set(rates.map(r => r.categoryId)).size}
            </p>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl shadow-2xl ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`px-6 py-5 border-b flex items-center justify-between ${
              isDarkMode ? 'border-slate-700 bg-slate-700' : 'border-gray-200 bg-gray-50'
            }`}>
              <div>
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingRate ? 'Edit Rate' : 'Create Rate'}
                </h2>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Configure earnings for doers and checkers
                </p>
              </div>
              <button
                onClick={handleCancel}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-slate-600 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                }`}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Category Selection */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    disabled={!!editingRate}
                    className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm ${
                      isDarkMode
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="">Select a category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Doer Rate */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Doer Rate (Amount earned per approved task) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.doerRate}
                    onChange={(e) => setFormData({ ...formData, doerRate: e.target.value })}
                    placeholder="0.00"
                    className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm ${
                      isDarkMode
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Amount doer receives when checker approves the task
                  </p>
                </div>

                {/* Checker Rate Per Mistake */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Checker Rate Per Mistake (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.checkerRatePerMistake}
                    onChange={(e) => setFormData({ ...formData, checkerRatePerMistake: e.target.value })}
                    placeholder="1.00"
                    className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm ${
                      isDarkMode
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Percentage of doer rate earned per unchecked/incorrect checklist item
                  </p>
                </div>

                {/* Effective Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Effective From
                    </label>
                    <input
                      type="date"
                      value={formData.effectiveFrom}
                      onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm ${
                        isDarkMode
                          ? 'bg-slate-700 border-slate-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Effective To
                    </label>
                    <input
                      type="date"
                      value={formData.effectiveTo}
                      onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                      min={formData.effectiveFrom}
                      className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm ${
                        isDarkMode
                          ? 'bg-slate-700 border-slate-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                </div>

                {/* Example Calculation */}
                {formData.doerRate && formData.checkerRatePerMistake && (
                  <div className={`p-4 rounded-lg border-2 ${
                    isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      Example Calculation
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                      If doer rate is ₹{formData.doerRate} and checker finds 3 mistakes:{' '}
                      Checker earns ₹{(
                        (parseFloat(formData.doerRate) * parseFloat(formData.checkerRatePerMistake)) / 100 * 3
                      ).toFixed(2)} (1% of {formData.doerRate} × 3 mistakes)
                    </p>
                  </div>
                )}
              </form>
            </div>

            {/* Actions */}
            <div className={`flex justify-end gap-3 px-6 py-4 border-t ${
              isDarkMode ? 'border-slate-700 bg-slate-700' : 'border-gray-200 bg-gray-50'
            }`}>
              <button
                onClick={handleCancel}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isDarkMode
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Save size={20} />
                {editingRate ? 'Update Rate' : 'Create Rate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rates List */}
      <div className={`rounded-xl border-2 ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        {rates.length === 0 ? (
          <div className={`p-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <DollarSign size={64} className="mx-auto mb-4 opacity-50" />
            <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              No Rates Configured
            </h3>
            <p className="text-sm mb-4">
              Create rate configurations to enable automatic payouts
            </p>
            <button
              onClick={handleCreate}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Create Rate
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${
                isDarkMode ? 'bg-slate-700' : 'bg-gray-100'
              }`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Category
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Doer Rate
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Checker/ Mistake
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Effective Period
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Status
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDarkMode ? 'divide-slate-700' : 'divide-gray-200'
              }`}>
                {rates.map((rate) => (
                  <tr key={rate.id} className="hover:opacity-80 transition-opacity">
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {getCategoryName(rate.categoryId)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      ₹{rate.doerRate.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {rate.checkerRatePerMistake}%
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {rate.effectiveFrom} {rate.effectiveTo ? `to ${rate.effectiveTo}` : '(Ongoing)'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rate.status === 'active'
                          ? isDarkMode
                            ? 'bg-green-900/30 text-green-300'
                            : 'bg-green-100 text-green-700'
                          : isDarkMode
                          ? 'bg-gray-900/30 text-gray-300'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {rate.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(rate)}
                          className={`p-2 rounded-lg transition-colors ${
                            isDarkMode
                              ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                          }`}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(rate.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            isDarkMode
                              ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                              : 'bg-red-50 hover:bg-red-100 text-red-700'
                          }`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className={`p-6 rounded-xl max-w-md w-full mx-4 ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-600" size={24} />
              <h3 className={`text-lg font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Confirm Delete
              </h3>
            </div>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Are you sure you want to delete this rate? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateManagerPage;

