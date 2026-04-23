import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { loginUser } from '../features/auth/auth.service';

const LoginScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const validate = () => {
        if (!email.trim()) {
            Toast.show({ type: 'error', text1: 'Email is required' });
            return false;
        }
        if (!password.trim()) {
            Toast.show({ type: 'error', text1: 'Password is required' });
            return false;
        }
        return true;
    };

    const handleLogin = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            await loginUser(email.trim(), password);
            Toast.show({ type: 'success', text1: 'Welcome back! 🤲' });
        } catch (err: any) {
            const message =
                err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
                    ? 'Invalid email or password.'
                    : err.code === 'auth/user-not-found'
                        ? 'No account found with this email.'
                        : err.code === 'auth/too-many-requests'
                            ? 'Too many attempts. Try again later.'
                            : err.message;
            Toast.show({ type: 'error', text1: 'Login Failed', text2: message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={['#101a15', '#080d0a']} className="flex-1">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    className="px-8 py-12"
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header Section */}
                    <View className="items-center mb-12">
                        <View className="bg-[#dbb142]/10 p-5 rounded-full border border-[#dbb142]/20 mb-6">
                            <Ionicons name="moon-outline" size={40} color="#dbb142" />
                        </View>
                        <Text
                            className="text-white text-3xl font-bold tracking-[4px] text-center mb-2"
                            style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
                        >
                            PRAYER LOCK
                        </Text>
                        <Text className="text-white/40 text-[14px] tracking-widest uppercase font-medium">
                            Return to Tranquility
                        </Text>
                    </View>

                    {/* Card Container */}
                    <View className="bg-[#19231d]/80 rounded-[32px] p-7 border border-white/5 shadow-2xl">
                        
                        {/* Email Input */}
                        <Text className="text-[#88988a] text-[11px] font-bold tracking-[2px] mb-2 ml-1 uppercase">
                            Email Address
                        </Text>
                        <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/10 mb-5 px-5">
                            <Ionicons name="mail-outline" size={18} color="#707f71" />
                            <TextInput
                                placeholder="heart@peace.com"
                                placeholderTextColor="#707f71"
                                className="flex-1 py-4 px-3 text-white text-[15px]"
                                onChangeText={setEmail}
                                value={email}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        {/* Password Input */}
                        <View className="flex-row justify-between items-end mb-2">
                            <Text className="text-[#88988a] text-[11px] font-bold tracking-[2px] ml-1 uppercase">
                                Password
                            </Text>
                            <TouchableOpacity>
                                <Text className="text-[#dbb142] text-[11px] font-medium">Forgot?</Text>
                            </TouchableOpacity>
                        </View>
                        <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/10 mb-8 px-5">
                            <Ionicons name="lock-closed-outline" size={18} color="#707f71" />
                            <TextInput
                                placeholder="••••••••••••"
                                placeholderTextColor="#707f71"
                                secureTextEntry={!showPassword}
                                className="flex-1 py-4 px-3 text-white text-[15px]"
                                onChangeText={setPassword}
                                value={password}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons 
                                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                    size={20} 
                                    color="#707f71" 
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            className={`py-4.5 rounded-2xl items-center justify-center shadow-lg ${loading ? 'bg-[#dbb142]/70' : 'bg-[#dbb142]'}`}
                            style={{ paddingVertical: 18 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#101a15" size="small" />
                            ) : (
                                <Text className="text-[#101a15] font-bold tracking-[2px] text-[16px] uppercase">
                                    Sign In
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Footer Link */}
                        <View className="flex-row justify-center mt-8">
                            <Text className="text-white/40 text-[14px]">New seeker? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                                <Text className="text-[#dbb142] font-bold text-[14px]">Create Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Security Badge */}
                    <View className="flex-row justify-center items-center mt-10 opacity-30">
                        <Ionicons name="shield-checkmark-outline" size={14} color="#88988a" />
                        <Text className="text-[#88988a] text-[10px] ml-2 tracking-[1px] uppercase">
                            Secure End-to-End Encryption
                        </Text>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

export default LoginScreen;