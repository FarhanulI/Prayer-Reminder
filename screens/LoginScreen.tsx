import GoogleIcon from '@/components/GoogleIcon';
import { Card } from '@/components/ui/card';
import colors from '@/constants/colors.json';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { loginUser } from '../features/auth/auth.service';
import { GoogleSignInError } from '../features/auth/googleSignIn.service';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';

const LoginScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { signInWithGoogle, googleLoading, getGoogleSignInErrorMessage } = useGoogleSignIn();

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

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
            // Toast.show({ type: 'success', text1: 'Welcome back! 🤲' });
        } catch (err: unknown) {
            if (err instanceof GoogleSignInError && err.reason === 'cancelled') {
                return;
            }
            Toast.show({
                type: 'error',
                text1: 'Google Sign In Failed',
                text2: getGoogleSignInErrorMessage(err),
            });
        }
    };

    return (
        <LinearGradient colors={[colors['emerald-login-bg'], colors['emerald-login-bg-end']]} className="flex-1">
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
                        <View className="bg-gold/10 p-5 rounded-full border border-gold/20 mb-6">
                            <Ionicons name="moon-outline" size={40} color={colors.gold} />
                        </View>
                        <Text
                            className="text-white text-3xl font-bold tracking-[4px] text-center mb-2"
                            style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
                        >
                            Salah Reminder
                        </Text>
                        <Text className="text-white/40 text-[14px] tracking-widest uppercase font-medium">
                            Return to Tranquility
                        </Text>
                    </View>

                    <ImageBackground
                        source={require("@/assets/images/bgOverlay.png")}
                        className="bg-emerald-dark border border-white/5 rounded-2xl mb-8 overflow-hidden"
                        imageStyle={{ opacity: 0.30 }}
                    >
                        <View className="p-6 items-center">
                            <MaterialCommunityIcons name="format-quote-open" size={32} color={`${colors.gold}99`} style={{ marginBottom: 12 }} />
                            <Text
                                className="text-white text-[22px] italic text-center leading-8 mb-4"
                                style={{ fontFamily: Platform.OS === "ios" ? "Georgia" : "serif" }}
                            >
                                “Indeed, I am Allah. There is no deity except Me, so worship Me and establish prayer for My remembrance"
                            </Text>
                            <Text className="text-gold text-xs font-bold uppercase tracking-widest">
                                — Surah Taha, verse 14
                            </Text>
                        </View>
                    </ImageBackground>

                    {/* Card Container */}
                    <Card variant="auth">

                        {/* Email Input */}
                        {/* <Text className="text-emerald-muted text-[11px] font-bold tracking-[2px] mb-2 ml-1 uppercase">
                            Email Address
                        </Text>
                        <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/10 mb-5 px-5">
                            <Ionicons name="mail-outline" size={18} color={colors['emerald-placeholder']} />
                            <TextInput
                                placeholder="heart@peace.com"
                                placeholderTextColor={colors['emerald-placeholder']}
                                className="flex-1 py-4 px-3 text-white text-[15px]"
                                onChangeText={setEmail}
                                value={email}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View> */}

                        {/* Password Input */}
                        {/* <View className="flex-row justify-between items-end mb-2">
                            <Text className="text-emerald-muted text-[11px] font-bold tracking-[2px] ml-1 uppercase">
                                Password
                            </Text>
                            <TouchableOpacity>
                                <Text className="text-gold text-[11px] font-medium">Forgot?</Text>
                            </TouchableOpacity>
                        </View> */}
                        {/* <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/10 mb-8 px-5">
                            <Ionicons name="lock-closed-outline" size={18} color={colors['emerald-placeholder']} />
                            <TextInput
                                placeholder="••••••••••••"
                                placeholderTextColor={colors['emerald-placeholder']}
                                secureTextEntry={!showPassword}
                                className="flex-1 py-4 px-3 text-white text-[15px]"
                                onChangeText={setPassword}
                                value={password}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color={colors['emerald-placeholder']}
                                />
                            </TouchableOpacity>
                        </View> */}

                        {/* Login Button */}
                        {/* <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            className={`py-4.5 rounded-2xl items-center justify-center shadow-lg ${loading ? 'bg-gold/70' : 'bg-gold'}`}
                            style={{ paddingVertical: 18 }}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors['emerald-login-bg']} size="small" />
                            ) : (
                                <Text className="text-emerald-login-bg font-bold tracking-[2px] text-[16px] uppercase">
                                    Sign In
                                </Text>
                            )}
                        </TouchableOpacity> */}
                        {/* 
                        <View className="flex-row items-center my-8">
                            <View className="flex-1 h-[1px] bg-white/10" />
                            <Text className="text-emerald-muted text-[11px] font-bold tracking-[2px] mx-4 uppercase">
                                Or
                            </Text>
                            <View className="flex-1 h-[1px] bg-white/10" />
                        </View> */}

                        <TouchableOpacity
                            onPress={handleGoogleSignIn}
                            disabled={loading || googleLoading}
                            className="flex-row bg-gold/40 items-center justify-center py-4 rounded-2xl border border-white/15"
                        >
                            {googleLoading ? (
                                <ActivityIndicator color={colors.gold} size="small" />
                            ) : (
                                <>
                                    <GoogleIcon />
                                    <Text className="text-white font-semibold ml-2 text-[15px]">
                                        Continue with Google
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Footer Link */}
                        {/* <View className="flex-row justify-center mt-8">
                            <Text className="text-white/40 text-[14px]">New seeker? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                                <Text className="text-gold font-bold text-[14px]">Create Account</Text>
                            </TouchableOpacity>
                        </View> */}
                    </Card>

                    {/* Security Badge */}


                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

export default LoginScreen;