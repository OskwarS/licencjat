import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, Platform, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

export default function ExploreScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixedCosts, setFixedCosts] = useState<any[]>([]);

  const fetchTransactions = async () => {
    try {
      const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
      let API_BASE = 'http://localhost:3000'; 
      if (hostUri) {
         const devIp = hostUri.split(':')[0];
         API_BASE = `http://${devIp}:3000`;
      } else if (Platform.OS === 'android') {
         API_BASE = 'http://10.0.2.2:3000';
      }
      
      const res = await axios.get(`${API_BASE}/api/transactions/1`);
      setTransactions(res.data);
      
      const resCosts = await axios.get(`${API_BASE}/api/fixed-costs/1`);
      setFixedCosts(resCosts.data);
    } catch (error) {
      console.warn("Błąd pobierania historii. Wczytuję zaślepkę MVP.");
      setTransactions([
        { id: 999, category: "Kawa Starbucks (Mock)", amount: 45, type: "wants", date: new Date().toISOString() },
        { id: 998, category: "Spotify (Mock)", amount: 15, type: "wants", date: new Date().toISOString() },
        { id: 997, category: "Lidl (Mock)", amount: 150, type: "needs", date: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000); // Odświeżanie częstsze dla listy
    return () => clearInterval(interval);
  }, []);

  const API_BASE_SCOPE = (() => {
      const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
      if (hostUri) return `http://${hostUri.split(':')[0]}:3000`;
      return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  })();

  const deleteFixedCost = async (id: number) => {
    try {
       await axios.delete(`${API_BASE_SCOPE}/api/fixed-costs/${id}`);
       fetchTransactions();
    } catch(e) {
       console.error(e);
    }
  };

  const renderRightFixedCost = (id: number) => (
    <TouchableOpacity onPress={() => deleteFixedCost(id)} className="bg-red-500 justify-center items-center px-4 rounded-xl mb-2 ml-2 border border-red-600/80">
        <Ionicons name="trash" size={20} color="white" />
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-zinc-900/80 rounded-2xl p-4 flex-row justify-between items-center mb-3 border border-zinc-800/80">
      <View className="flex-row items-center flex-1 pr-4">
        <View className={`p-3 rounded-2xl mr-4 ${item.type === 'needs' ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}>
          <Ionicons 
            name={item.type === 'needs' ? 'cart' : 'cafe'} 
            size={20} 
            color={item.type === 'needs' ? '#3b82f6' : '#10b981'} 
          />
        </View>
        <View className="flex-1">
          <Text className="text-zinc-200 text-base font-semibold" numberOfLines={1}>{item.category}</Text>
          <Text className="text-zinc-500 text-xs mt-1">
            {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
      </View>
      <Text className="text-zinc-300 font-bold">{item.amount.toFixed(2)} zł</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-zinc-950 pt-8">
      <View className="px-6 mb-6">
        <Text className="text-white text-3xl font-extrabold mb-2">Historia Wydatków</Text>
        <Text className="text-zinc-400 text-base mb-2">Pełen wgląd w operacje ujęte w DB</Text>
      </View>

      {/* Prawdziwe rachunki ze stałych kosztów przypisane przez usera */}
      <View className="px-6 pb-2 mb-4 border-b border-zinc-800/50">
        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Zobowiązania (Zablokowane rachunki)</Text>
        {fixedCosts.map(cost => (
           <Swipeable key={cost.id} renderRightActions={() => renderRightFixedCost(cost.id)}>
             <View className="bg-zinc-900/40 rounded-xl p-3 flex-row justify-between items-center mb-2">
               <View className="flex-row items-center flex-1">
                 <Ionicons name="pricetag" size={16} color="#a1a1aa" style={{marginRight: 8}} />
                 <Text className="text-zinc-300 font-medium uppercase" numberOfLines={1}>{cost.keyword}</Text>
               </View>
               <Text className="text-red-400 font-bold">{cost.amount.toFixed(2)} zł</Text>
             </View>
           </Swipeable>
        ))}
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#10b981" className="mt-10" />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text className="text-zinc-500 text-center mt-10">Brak historii transakcji.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
