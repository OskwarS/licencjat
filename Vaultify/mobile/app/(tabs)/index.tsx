import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Platform, TextInput, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const [budgetData, setBudgetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [smartAllocation, setSmartAllocation] = useState(50); // Domyslny suwak na srodku 
  const [fixedCosts, setFixedCosts] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  const simulatedRaise = 1000;
  const smartSavings = simulatedRaise * (smartAllocation / 100);
  const spentRaise = simulatedRaise - smartSavings;

  const fetchBudget = async () => {
    try {
      // Rozwiązanie Ostateczne: Kaskadowe sprawdzanie adresu
      const Constants = require('expo-constants').default;
      const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;

      let API_BASE = 'http://localhost:3000'; // Web
      if (hostUri) {
        // Wyciągnięcie prawdziwego, dynamicznego LAN IP Twojego komputera przypisanego przez router (np. 192.168.1.X)
        const devIp = hostUri.split(':')[0];
        API_BASE = `http://${devIp}:3000`;
      } else if (Platform.OS === 'android') {
        API_BASE = 'http://10.0.2.2:3000'; // Emulator wirtualny
      }

      const res = await axios.get(`${API_BASE}/api/budget/status/1`);
      setBudgetData(res.data);

      const resCosts = await axios.get(`${API_BASE}/api/fixed-costs/1`);
      setFixedCosts(resCosts.data);
    } catch (error) {
      console.warn("Sieć blokuje API Node.js. Ładuję sztuczne dane MVP (Mock) do interfejsu...");
      setBudgetData({
        net_income: 5000,
        base_wants: 1500,
        spent_wants: 150,
        safe_to_spend: 1350,
        daily_allowance: 225,
        days_left: 6
      });
    } finally {
      setLoading(false);
    }
  };

  const API_BASE = (() => {
    const Constants = require('expo-constants').default;
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
    if (hostUri) return `http://${hostUri.split(':')[0]}:3000`;
    return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  })();

  const addFixedCost = async () => {
    if (!newKeyword.trim()) return;
    try {
      await axios.post(`${API_BASE}/api/fixed-costs`, { user_id: 1, keyword: newKeyword });
      setNewKeyword('');
      fetchBudget(); 
    } catch (e: any) {
      if (e.response && e.response.status === 404) {
         Alert.alert('Problem', 'Brak takiego wydatku w Twoim wyciągu!');
      } else {
         console.error(e);
      }
    }
  };

  const deleteFixedCost = async (id: number) => {
    try {
       await axios.delete(`${API_BASE}/api/fixed-costs/${id}`);
       fetchBudget();
    } catch(e) {
       console.error(e);
    }
  };

  const renderRightActions = (id: number) => (
    <TouchableOpacity onPress={() => deleteFixedCost(id)} className="bg-red-500 justify-center items-center px-5 rounded-2xl mb-3 ml-2 border border-red-600/80">
        <Ionicons name="trash" size={24} color="white" />
    </TouchableOpacity>
  );

  useEffect(() => {
    fetchBudget();
    // Odświeżaj co 10 sekund dla celów demo
    const interval = setInterval(fetchBudget, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !budgetData) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // Logika zmiany koloru "Dniówki" przy przekroczeniu
  const dailyColor = budgetData.daily_allowance < 20 ? 'text-orange-500' : 'text-emerald-400';

  return (
    <SafeAreaView className="flex-1 bg-zinc-950 pt-8">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <Text className="text-white text-2xl font-bold">Vaultify</Text>
          <View className="bg-zinc-800 p-2.5 rounded-full">
            <Ionicons name="person" size={20} color="white" />
          </View>
        </View>

        {/* Główny Widget - Safe to Spend */}
        <View className="items-center mb-10 mt-2">
          <Text className="text-zinc-400 text-lg mb-2">Dostępne na zachcianki w tym mies.</Text>
          <Text className="text-emerald-400 text-6xl font-extrabold tracking-tighter shadow-xl shadow-emerald-500/20">
            {budgetData.safe_to_spend.toFixed(2)} zł
          </Text>
        </View>

        {/* Wskaźnik Dnia */}
        <View className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-6 mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-zinc-400 text-base font-medium">Dziś możesz wydać</Text>
            <Ionicons name="calendar-outline" size={24} color="#a1a1aa" />
          </View>
          <Text className={`text-5xl font-bold tracking-tight ${dailyColor}`}>
            {budgetData.daily_allowance.toFixed(2)} zł
          </Text>
          <Text className="text-zinc-500 mt-2 text-sm font-medium">Pozostało {budgetData.days_left} dni do końca miesiąca</Text>
        </View>

        {/* Podatek dla Przyszłego Mnie */}
        <View className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-6 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-zinc-300 font-bold text-lg">Podatek dla Przyszłego Mnie</Text>
            <Ionicons name="trending-up" size={24} color="#10b981" />
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-zinc-400 text-sm font-medium">Odłożone w tym miesiącu:</Text>
            <Text className="text-zinc-300 text-sm font-bold">{(budgetData.net_income * 0.2).toFixed(0)} zł</Text>
          </View>
          <View className="h-4 bg-zinc-800 rounded-full overflow-hidden mt-1">
            <View className="h-full bg-emerald-500 w-full" style={{ width: '100%' }} />
          </View>
        </View>

        {/* Symulator SMarT */}
        <View className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-6 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-zinc-300 font-bold text-lg">Symulator SMarT</Text>
            <Ionicons name="rocket" size={24} color="#10b981" />
          </View>
          <Text className="text-zinc-400 text-sm mb-4 leading-relaxed">
            Zabezpiecz swoją przyszłą podwyżkę przed efektem <Text className="text-zinc-300 font-medium">lifestylist creep</Text>. Ustal swój suwak, zanim pieniądze wpłyną na konto.
          </Text>

          <View className="bg-zinc-950 rounded-2xl p-4 mb-5 items-center border border-zinc-800/50 shadow-inner">
            <Text className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-1">Oczekiwana Podwyżka</Text>
            <Text className="text-zinc-200 text-2xl font-black">+ 1 000.00 zł</Text>
          </View>

          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-zinc-400 text-sm font-medium">Poziom Oszczędności:</Text>
            <Text className="text-blue-400 text-xl font-black">{smartAllocation}%</Text>
          </View>

          {/* SMarT Slider / Stepper */}
          <View className="flex-row items-center justify-between bg-zinc-950 rounded-full p-2 mb-6 border border-zinc-800">
            <TouchableOpacity
              onPress={() => setSmartAllocation(Math.max(0, smartAllocation - 10))}
              className={`w-12 h-12 rounded-full items-center justify-center ${smartAllocation <= 0 ? 'bg-zinc-800/50' : 'bg-zinc-800'}`}
              disabled={smartAllocation <= 0}
            >
              <Ionicons name="remove" size={24} color={smartAllocation <= 0 ? '#52525b' : '#d4d4d8'} />
            </TouchableOpacity>

            <View className="flex-1 h-2.5 bg-zinc-800 mx-4 rounded-full overflow-hidden">
              <View className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" style={{ width: `${smartAllocation}%` }} />
            </View>

            <TouchableOpacity
              onPress={() => setSmartAllocation(Math.min(100, smartAllocation + 10))}
              className={`w-12 h-12 rounded-full items-center justify-center ${smartAllocation >= 100 ? 'bg-zinc-800/50' : 'bg-zinc-800'}`}
              disabled={smartAllocation >= 100}
            >
              <Ionicons name="add" size={24} color={smartAllocation >= 100 ? '#52525b' : '#d4d4d8'} />
            </TouchableOpacity>
          </View>

          {/* SMarT Results */}
          <View className="flex-row justify-between">
            <View className="flex-1 mr-2 bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/80 items-center justify-center">
              <Text className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Przejesz</Text>
              <Text className="text-zinc-300 text-lg font-bold">{spentRaise.toFixed(0)} zł</Text>
            </View>
            <View className="flex-1 ml-2 bg-blue-500/10 p-4 rounded-xl border border-blue-500/30 items-center justify-center">
              <Text className="text-blue-400/80 text-[10px] uppercase font-bold tracking-wider mb-1">Oszczędzisz</Text>
              <Text className="text-blue-400 text-lg font-bold shadow-blue-500">+{smartSavings.toFixed(0)} zł</Text>
            </View>
          </View>
        </View>

        {/* Inteligentne Zablokowane rachunki */}
        <View className="mb-4">
          <Text className="text-zinc-300 font-bold text-lg mb-4">Zablokowane rachunki 🕵️</Text>

          {fixedCosts.map((cost) => (
            <Swipeable key={cost.id} renderRightActions={() => renderRightActions(cost.id)}>
              <View className="bg-zinc-900/80 rounded-2xl p-4 flex-row justify-between items-center mb-3 border border-zinc-800/80">
                <View className="flex-row items-center flex-1 pr-4">
                  <View className="bg-zinc-800/80 p-3 rounded-2xl mr-4">
                    <Ionicons name="pricetag" size={20} color="#a1a1aa" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-zinc-200 text-base font-semibold uppercase">{cost.keyword}</Text>
                    <Text className="text-zinc-500 text-[10px]" numberOfLines={1}>{cost.matchedAs}</Text>
                  </View>
                </View>
                <Text className="text-zinc-300 font-bold">{cost.amount.toFixed(2)} zł</Text>
              </View>
            </Swipeable>
          ))}

          <Text className="text-zinc-500 text-xs text-center mt-2 mb-2">Aplikacja odnajdzie dokładny, najświeższy koszt powyższego rachunku z wyciągu we wszystkich rachunkach.</Text>

          {/* Pole wpisywania własnych rachunków */}
          <View className="bg-zinc-950 rounded-2xl p-2 flex-row border border-dashed border-zinc-700/80 items-center">
            <TextInput
              className="flex-1 text-zinc-200 px-4 h-10"
              placeholder="np. Spotify, Netflix..."
              placeholderTextColor="#52525b"
              value={newKeyword}
              onChangeText={setNewKeyword}
            />
            <TouchableOpacity className="bg-blue-600 p-2 rounded-xl" onPress={addFixedCost}>
              <Ionicons name="search" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-emerald-500 w-16 h-16 rounded-full items-center justify-center shadow-2xl shadow-emerald-500/40"
        onPress={() => console.log('Dodaj wydatek')}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
