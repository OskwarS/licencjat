import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [savingsModel, setSavingsModel] = useState('503020');
  const [expectedRaise, setExpectedRaise] = useState('');
  const [smartAllocation, setSmartAllocation] = useState(50);
  const [customNeeds, setCustomNeeds] = useState(50);
  const [customWants, setCustomWants] = useState(30);
  const [customSavings, setCustomSavings] = useState(20);
  const [payday, setPayday] = useState(1);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');

  const API_BASE = (() => {
    const Constants = require('expo-constants').default;
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
    if (hostUri) return `http://${hostUri.split(':')[0]}:3000`;
    return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  })();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/user/1`);
      setName(res.data.name || '');
      setIncome(res.data.net_income?.toString() || '5000');
      setSavingsModel(res.data.savings_model || '503020');
      setExpectedRaise(res.data.expected_raise?.toString() || '0');
      setSmartAllocation(res.data.smart_allocation || 50);
      setCustomNeeds(res.data.custom_needs ?? 50);
      setCustomWants(res.data.custom_wants ?? 30);
      setCustomSavings(res.data.custom_savings ?? 20);
      setPayday(res.data.payday || 1);

      const goalsRes = await axios.get(`${API_BASE}/api/savings-goals/1`);
      setSavingsGoals(goalsRes.data || []);
    } catch (e) {
      console.warn('Nie udało się załadować profilu');
    } finally {
      setLoading(false);
    }
  };

  // Inteligentne przeliczanie – zawsze utrzymuje sumę = 100%
  const adjustCustom = (field: 'needs' | 'wants' | 'savings', delta: number) => {
    let n = customNeeds, w = customWants, s = customSavings;
    
    if (field === 'needs') n = Math.max(0, Math.min(100, n + delta));
    else if (field === 'wants') w = Math.max(0, Math.min(100, w + delta));
    else s = Math.max(0, Math.min(100, s + delta));

    // Jeśli suma > 100, redukuj inne pola proporcjonalnie
    const total = n + w + s;
    if (total > 100) {
      const excess = total - 100;
      if (field === 'needs') {
        // Odejmij nadmiar od wants i savings proporcjonalnie
        const ratio = w / (w + s || 1);
        w = Math.max(0, Math.round(w - excess * ratio));
        s = 100 - n - w;
      } else if (field === 'wants') {
        const ratio = n / (n + s || 1);
        n = Math.max(0, Math.round(n - excess * ratio));
        s = 100 - n - w;
      } else {
        const ratio = n / (n + w || 1);
        n = Math.max(0, Math.round(n - excess * ratio));
        w = 100 - n - s;
      }
    }

    setCustomNeeds(Math.max(0, n));
    setCustomWants(Math.max(0, w));
    setCustomSavings(Math.max(0, s));
  };

  const saveProfile = async () => {
    const numIncome = parseFloat(income);
    if (isNaN(numIncome) || numIncome <= 0) {
      Alert.alert('Błąd', 'Podaj poprawną kwotę zarobków.');
      return;
    }

    if (savingsModel === 'custom' && (customNeeds + customWants + customSavings) !== 100) {
      Alert.alert('Błąd', 'Procenty muszą sumować się do 100%.');
      return;
    }

    setSaving(true);
    try {
      await axios.put(`${API_BASE}/api/user/1`, {
        name: name.trim() || 'Demo User',
        net_income: numIncome,
        savings_model: savingsModel,
        expected_raise: parseFloat(expectedRaise) || 0,
        smart_allocation: smartAllocation,
        custom_needs: customNeeds,
        custom_wants: customWants,
        custom_savings: customSavings,
        payday: payday,
      });
      Alert.alert('Sukces ✅', 'Profil został zaktualizowany!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się zapisać profilu.');
    } finally {
      setSaving(false);
    }
  };

  const addGoal = async () => {
    if (!newGoalName.trim() || !newGoalAmount.trim()) {
      Alert.alert('Błąd', 'Podaj nazwę i kwotę celu.');
      return;
    }
    try {
      await axios.post(`${API_BASE}/api/savings-goals`, {
        user_id: 1,
        name: newGoalName.trim(),
        target_amount: parseFloat(newGoalAmount),
      });
      setNewGoalName('');
      setNewGoalAmount('');
      const goalsRes = await axios.get(`${API_BASE}/api/savings-goals/1`);
      setSavingsGoals(goalsRes.data || []);
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się dodać celu.');
    }
  };

  const deleteGoal = async (id: number) => {
    try {
      await axios.delete(`${API_BASE}/api/savings-goals/${id}`);
      const goalsRes = await axios.get(`${API_BASE}/api/savings-goals/1`);
      setSavingsGoals(goalsRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const updateGoalProgress = async (id: number, currentAmount: number) => {
    try {
      await axios.put(`${API_BASE}/api/savings-goals/${id}`, { current_amount: currentAmount });
      const goalsRes = await axios.get(`${API_BASE}/api/savings-goals/1`);
      setSavingsGoals(goalsRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const incomeNum = parseFloat(income) || 0;

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        
        {/* Avatar + Imię */}
        <View className="items-center mb-8">
          <View className="bg-zinc-800 w-24 h-24 rounded-full items-center justify-center mb-4 border-2 border-emerald-500/30">
            <Ionicons name="person" size={48} color="#10b981" />
          </View>
          <TextInput
            className="text-white text-2xl font-bold text-center bg-transparent border-b border-zinc-700 pb-2 w-64"
            placeholder="Twoje imię"
            placeholderTextColor="#52525b"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Sekcja: Zarobki */}
        <View className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-6 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="bg-emerald-500/10 p-3 rounded-2xl mr-4">
              <Ionicons name="wallet" size={24} color="#10b981" />
            </View>
            <View>
              <Text className="text-zinc-300 font-bold text-lg">Miesięczne zarobki</Text>
              <Text className="text-zinc-500 text-xs">Kwota netto wpływająca na konto</Text>
            </View>
          </View>
          <View className="flex-row items-center bg-zinc-950 rounded-2xl border border-zinc-800 p-2">
            <TextInput
              className="flex-1 text-emerald-400 text-3xl font-bold text-center px-4 h-14"
              keyboardType="numeric"
              value={income}
              onChangeText={setIncome}
              placeholder="5000"
              placeholderTextColor="#52525b"
            />
            <Text className="text-zinc-500 text-xl font-bold mr-4">zł</Text>
          </View>
        </View>

        {/* Sekcja: Dzień wypłaty */}
        <View className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-6 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="bg-amber-500/10 p-3 rounded-2xl mr-4">
              <Ionicons name="calendar" size={24} color="#f59e0b" />
            </View>
            <View>
              <Text className="text-zinc-300 font-bold text-lg">Dzień wypłaty</Text>
              <Text className="text-zinc-500 text-xs">Którego dnia wpływa pensja</Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => setPayday(Math.max(1, payday - 1))}
              className="w-12 h-12 rounded-full bg-zinc-800 items-center justify-center"
            >
              <Ionicons name="remove" size={24} color="#d4d4d8" />
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-amber-400 text-4xl font-black">{payday}</Text>
              <Text className="text-zinc-500 text-xs">dzień miesiąca</Text>
            </View>
            <TouchableOpacity
              onPress={() => setPayday(Math.min(31, payday + 1))}
              className="w-12 h-12 rounded-full bg-zinc-800 items-center justify-center"
            >
              <Ionicons name="add" size={24} color="#d4d4d8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sekcja: Model oszczędzania */}
        <View className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-6 mb-6">
          <View className="flex-row items-center mb-5">
            <View className="bg-blue-500/10 p-3 rounded-2xl mr-4">
              <Ionicons name="pie-chart" size={24} color="#3b82f6" />
            </View>
            <View>
              <Text className="text-zinc-300 font-bold text-lg">Model oszczędzania</Text>
              <Text className="text-zinc-500 text-xs">Jak dzielić Twoje pieniądze</Text>
            </View>
          </View>

          {/* Rząd 1: 50/30/20 i SMarT */}
          <View className="flex-row gap-3 mb-3">
            <TouchableOpacity 
              onPress={() => setSavingsModel('503020')}
              className={`flex-1 p-4 rounded-2xl border-2 ${
                savingsModel === '503020' 
                  ? 'border-emerald-500 bg-emerald-500/10' 
                  : 'border-zinc-800 bg-zinc-950'
              }`}
            >
              <View className="items-center">
                <Text className={`text-xl font-black mb-1 ${savingsModel === '503020' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  50/30/20
                </Text>
                <Text className={`text-[10px] text-center ${savingsModel === '503020' ? 'text-emerald-400/70' : 'text-zinc-600'}`}>
                  Klasyczny
                </Text>
                <View className="flex-row mt-2 gap-0.5 w-full">
                  <View className={`h-1.5 rounded-full ${savingsModel === '503020' ? 'bg-blue-500' : 'bg-zinc-700'}`} style={{flex: 5}} />
                  <View className={`h-1.5 rounded-full ${savingsModel === '503020' ? 'bg-emerald-500' : 'bg-zinc-700'}`} style={{flex: 3}} />
                  <View className={`h-1.5 rounded-full ${savingsModel === '503020' ? 'bg-violet-500' : 'bg-zinc-700'}`} style={{flex: 2}} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setSavingsModel('smart')}
              className={`flex-1 p-4 rounded-2xl border-2 ${
                savingsModel === 'smart' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-zinc-800 bg-zinc-950'
              }`}
            >
              <View className="items-center">
                <Text className={`text-xl font-black mb-1 ${savingsModel === 'smart' ? 'text-blue-400' : 'text-zinc-500'}`}>
                  SMarT
                </Text>
                <Text className={`text-[10px] text-center ${savingsModel === 'smart' ? 'text-blue-400/70' : 'text-zinc-600'}`}>
                  Podwyżka
                </Text>
                <View className="mt-2">
                  <Ionicons name="trending-up" size={16} color={savingsModel === 'smart' ? '#3b82f6' : '#52525b'} />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Rząd 2: Własny */}
          <TouchableOpacity 
            onPress={() => setSavingsModel('custom')}
            className={`p-4 rounded-2xl border-2 ${
              savingsModel === 'custom' 
                ? 'border-violet-500 bg-violet-500/10' 
                : 'border-zinc-800 bg-zinc-950'
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="options" size={20} color={savingsModel === 'custom' ? '#8b5cf6' : '#52525b'} />
                <Text className={`text-lg font-black ml-3 ${savingsModel === 'custom' ? 'text-violet-400' : 'text-zinc-500'}`}>
                  Własny podział
                </Text>
              </View>
              <Text className={`text-xs ${savingsModel === 'custom' ? 'text-violet-400/70' : 'text-zinc-600'}`}>
                {customNeeds}/{customWants}/{customSavings}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sekcja: Własny podział - procenty (warunkowe) */}
        {savingsModel === 'custom' && (
          <View className="bg-zinc-900/80 border border-violet-500/20 rounded-3xl p-6 mb-6">
            <View className="flex-row items-center mb-5">
              <View className="bg-violet-500/10 p-3 rounded-2xl mr-4">
                <Ionicons name="options" size={24} color="#8b5cf6" />
              </View>
              <View>
                <Text className="text-zinc-300 font-bold text-lg">Twój podział</Text>
                <Text className="text-zinc-500 text-xs">Suma musi wynosić 100%</Text>
              </View>
            </View>

            {/* Potrzeby */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-blue-400 text-sm font-bold">🛒 Potrzeby (Needs)</Text>
                <Text className="text-blue-400 text-xl font-black">{customNeeds}%</Text>
              </View>
              <View className="flex-row items-center bg-zinc-950 rounded-full p-1.5 border border-zinc-800">
                <TouchableOpacity onPress={() => adjustCustom('needs', -5)} className="w-10 h-10 rounded-full items-center justify-center bg-zinc-800">
                  <Ionicons name="remove" size={20} color="#d4d4d8" />
                </TouchableOpacity>
                <View className="flex-1 h-2 bg-zinc-800 mx-3 rounded-full overflow-hidden">
                  <View className="h-full bg-blue-500 rounded-full" style={{ width: `${customNeeds}%` }} />
                </View>
                <TouchableOpacity onPress={() => adjustCustom('needs', 5)} className="w-10 h-10 rounded-full items-center justify-center bg-zinc-800">
                  <Ionicons name="add" size={20} color="#d4d4d8" />
                </TouchableOpacity>
              </View>
              <Text className="text-zinc-500 text-xs mt-1 text-right">{(incomeNum * customNeeds / 100).toFixed(0)} zł</Text>
            </View>

            {/* Zachcianki */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-emerald-400 text-sm font-bold">🎁 Zachcianki (Wants)</Text>
                <Text className="text-emerald-400 text-xl font-black">{customWants}%</Text>
              </View>
              <View className="flex-row items-center bg-zinc-950 rounded-full p-1.5 border border-zinc-800">
                <TouchableOpacity onPress={() => adjustCustom('wants', -5)} className="w-10 h-10 rounded-full items-center justify-center bg-zinc-800">
                  <Ionicons name="remove" size={20} color="#d4d4d8" />
                </TouchableOpacity>
                <View className="flex-1 h-2 bg-zinc-800 mx-3 rounded-full overflow-hidden">
                  <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${customWants}%` }} />
                </View>
                <TouchableOpacity onPress={() => adjustCustom('wants', 5)} className="w-10 h-10 rounded-full items-center justify-center bg-zinc-800">
                  <Ionicons name="add" size={20} color="#d4d4d8" />
                </TouchableOpacity>
              </View>
              <Text className="text-zinc-500 text-xs mt-1 text-right">{(incomeNum * customWants / 100).toFixed(0)} zł</Text>
            </View>

            {/* Oszczędności */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-violet-400 text-sm font-bold">💰 Oszczędności (Save)</Text>
                <Text className="text-violet-400 text-xl font-black">{customSavings}%</Text>
              </View>
              <View className="flex-row items-center bg-zinc-950 rounded-full p-1.5 border border-zinc-800">
                <TouchableOpacity onPress={() => adjustCustom('savings', -5)} className="w-10 h-10 rounded-full items-center justify-center bg-zinc-800">
                  <Ionicons name="remove" size={20} color="#d4d4d8" />
                </TouchableOpacity>
                <View className="flex-1 h-2 bg-zinc-800 mx-3 rounded-full overflow-hidden">
                  <View className="h-full bg-violet-500 rounded-full" style={{ width: `${customSavings}%` }} />
                </View>
                <TouchableOpacity onPress={() => adjustCustom('savings', 5)} className="w-10 h-10 rounded-full items-center justify-center bg-zinc-800">
                  <Ionicons name="add" size={20} color="#d4d4d8" />
                </TouchableOpacity>
              </View>
              <Text className="text-zinc-500 text-xs mt-1 text-right">{(incomeNum * customSavings / 100).toFixed(0)} zł</Text>
            </View>

            <View className={`rounded-2xl p-3 items-center border ${
              (customNeeds + customWants + customSavings) === 100 
                ? 'bg-emerald-500/5 border-emerald-500/30' 
                : 'bg-red-500/5 border-red-500/30'
            }`}>
              <Text className={`text-sm font-bold ${
                (customNeeds + customWants + customSavings) === 100 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                Suma: {customNeeds + customWants + customSavings}%
                {(customNeeds + customWants + customSavings) === 100 ? ' ✓' : ' (wymagane 100%)'}
              </Text>
            </View>
          </View>
        )}

        {/* Sekcja: SMarT - dodatkowe pola (warunkowe) */}
        {savingsModel === 'smart' && (
          <View className="bg-zinc-900/80 border border-blue-500/20 rounded-3xl p-6 mb-6">
            <View className="flex-row items-center mb-5">
              <View className="bg-blue-500/10 p-3 rounded-2xl mr-4">
                <Ionicons name="rocket" size={24} color="#3b82f6" />
              </View>
              <View>
                <Text className="text-zinc-300 font-bold text-lg">Parametry SMarT</Text>
                <Text className="text-zinc-500 text-xs">Ustaw ile podwyżki odłożysz</Text>
              </View>
            </View>

            <Text className="text-zinc-400 text-sm font-medium mb-2">Oczekiwana podwyżka</Text>
            <View className="flex-row items-center bg-zinc-950 rounded-2xl border border-zinc-800 p-2 mb-5">
              <TextInput
                className="flex-1 text-blue-400 text-2xl font-bold text-center px-4 h-12"
                keyboardType="numeric"
                value={expectedRaise}
                onChangeText={setExpectedRaise}
                placeholder="1000"
                placeholderTextColor="#52525b"
              />
              <Text className="text-zinc-500 text-lg font-bold mr-4">zł</Text>
            </View>

            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-zinc-400 text-sm font-medium">Ile odłożysz z podwyżki:</Text>
              <Text className="text-blue-400 text-xl font-black">{smartAllocation}%</Text>
            </View>

            <View className="flex-row items-center justify-between bg-zinc-950 rounded-full p-2 mb-4 border border-zinc-800">
              <TouchableOpacity
                onPress={() => setSmartAllocation(Math.max(0, smartAllocation - 10))}
                className={`w-12 h-12 rounded-full items-center justify-center ${smartAllocation <= 0 ? 'bg-zinc-800/50' : 'bg-zinc-800'}`}
                disabled={smartAllocation <= 0}
              >
                <Ionicons name="remove" size={24} color={smartAllocation <= 0 ? '#52525b' : '#d4d4d8'} />
              </TouchableOpacity>
              <View className="flex-1 h-2.5 bg-zinc-800 mx-4 rounded-full overflow-hidden">
                <View className="h-full bg-blue-500 rounded-full" style={{ width: `${smartAllocation}%` }} />
              </View>
              <TouchableOpacity
                onPress={() => setSmartAllocation(Math.min(100, smartAllocation + 10))}
                className={`w-12 h-12 rounded-full items-center justify-center ${smartAllocation >= 100 ? 'bg-zinc-800/50' : 'bg-zinc-800'}`}
                disabled={smartAllocation >= 100}
              >
                <Ionicons name="add" size={24} color={smartAllocation >= 100 ? '#52525b' : '#d4d4d8'} />
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between mt-2">
              <View className="flex-1 mr-2 bg-zinc-800/30 p-3 rounded-xl border border-zinc-800/80 items-center">
                <Text className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Przejadasz</Text>
                <Text className="text-zinc-300 text-base font-bold">
                  {((parseFloat(expectedRaise) || 0) * (1 - smartAllocation / 100)).toFixed(0)} zł
                </Text>
              </View>
              <View className="flex-1 ml-2 bg-blue-500/10 p-3 rounded-xl border border-blue-500/30 items-center">
                <Text className="text-blue-400/80 text-[10px] uppercase font-bold tracking-wider mb-1">Oszczędzasz</Text>
                <Text className="text-blue-400 text-base font-bold">
                  +{((parseFloat(expectedRaise) || 0) * (smartAllocation / 100)).toFixed(0)} zł
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Sekcja: Cele oszczędnościowe */}
        <View className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-6 mb-6">
          <View className="flex-row items-center mb-5">
            <View className="bg-emerald-500/10 p-3 rounded-2xl mr-4">
              <Ionicons name="flag" size={24} color="#10b981" />
            </View>
            <View>
              <Text className="text-zinc-300 font-bold text-lg">Cele oszczędnościowe</Text>
              <Text className="text-zinc-500 text-xs">Na co zbierasz pieniądze</Text>
            </View>
          </View>

          {/* Lista celów */}
          {savingsGoals.map((goal) => {
            const progress = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
            return (
              <View key={goal.id} className="bg-zinc-950 rounded-2xl p-4 mb-3 border border-zinc-800">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-zinc-200 font-bold text-base flex-1" numberOfLines={1}>{goal.name}</Text>
                  <TouchableOpacity onPress={() => deleteGoal(goal.id)} className="ml-2">
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-zinc-500 text-xs">{goal.current_amount.toFixed(0)} / {goal.target_amount.toFixed(0)} zł</Text>
                  <Text className="text-emerald-400 text-xs font-bold">{progress.toFixed(0)}%</Text>
                </View>
                <View className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-3">
                  <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                </View>
                {/* Szybkie dodanie kwoty */}
                <View className="flex-row gap-2">
                  {[100, 500, 1000].map((amount) => (
                    <TouchableOpacity 
                      key={amount}
                      onPress={() => updateGoalProgress(goal.id, goal.current_amount + amount)}
                      className="flex-1 bg-zinc-800 rounded-xl p-2 items-center"
                    >
                      <Text className="text-emerald-400 text-xs font-bold">+{amount} zł</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}

          {/* Dodaj nowy cel */}
          <View className="bg-zinc-950 rounded-2xl p-3 border border-dashed border-zinc-700/80">
            <View className="flex-row gap-2 mb-2">
              <TextInput
                className="flex-1 text-zinc-200 px-3 h-10 bg-zinc-900 rounded-xl border border-zinc-800"
                placeholder="Nazwa celu"
                placeholderTextColor="#52525b"
                value={newGoalName}
                onChangeText={setNewGoalName}
              />
              <TextInput
                className="w-24 text-zinc-200 px-3 h-10 bg-zinc-900 rounded-xl border border-zinc-800 text-center"
                placeholder="Kwota"
                placeholderTextColor="#52525b"
                keyboardType="numeric"
                value={newGoalAmount}
                onChangeText={setNewGoalAmount}
              />
            </View>
            <TouchableOpacity onPress={addGoal} className="bg-emerald-600 rounded-xl p-2.5 items-center">
              <Text className="text-white font-bold text-sm">Dodaj cel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Przycisk Zapisz */}
        <TouchableOpacity 
          onPress={saveProfile}
          disabled={saving}
          className={`rounded-2xl p-5 items-center mt-2 ${saving ? 'bg-emerald-800' : 'bg-emerald-500'}`}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text className="text-white text-lg font-bold ml-2">Zapisz zmiany</Text>
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
