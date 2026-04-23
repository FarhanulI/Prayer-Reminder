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
  View
} from 'react-native';
import Toast from 'react-native-toast-message';
// Icons: Ensure @expo/vector-icons is installed
import { signupUser } from '@/features/auth/auth.service';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const FONT_FAMILIES = {
  serif: Platform.OS === 'ios' ? 'Georgia' : 'serif', // Simple serif fallback
};

const COLORS = {
  bgGradient: ['#101a15', '#080d0a'] as const, // Dark green/black gradient
  cardBg: 'rgba(25, 35, 29, 0.7)', // Subtle dark card background
  inputBg: 'rgba(255, 255, 255, 0.05)', // Darker input field
  inputText: '#e2e8f0',
  placeholderText: '#707f71',
  label: '#88988a',
  accent: '#dbb142', // The Golden/Yellow color from image
  link: '#dbb142',
  textSecondary: 'rgba(255,255,255,0.65)',
};

const SignUpScreen = ({ navigation }: any) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const validate = () => {
    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Full Name is required' });
      return false;
    }
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Email is required' });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Toast.show({ type: 'error', text1: 'Enter a valid email address' });
      return false;
    }
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return false;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' });
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signupUser(email.trim(), password, fullName.trim());
      Toast.show({ type: 'success', text1: 'Account Created! 🎉' });
      navigation.navigate('OnBoarding');

    } catch (err: any) {
      const message =
        err.code === 'auth/email-already-in-use'
          ? 'This email is already registered.'
          : err.code === 'auth/invalid-email'
            ? 'Invalid email address.'
            : err.code === 'auth/weak-password'
              ? 'Password is too weak.'
              : err.message;
      Toast.show({ type: 'error', text1: 'Sign Up Failed', text2: message });
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
          contentContainerStyle={{ flexGrow: 1 }}
          className="px-6 py-12"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="items-center mb-10">
            <Text
              className="text-white text-3xl text-center mb-3"
              style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
            >
              Begin your journey
            </Text>
            <Text className="text-white/60 text-center text-[15px] leading-5 px-2">
              Create an account to preserve your focus and nurture your spiritual growth.
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-[#19231d]/70 rounded-2xl p-6 border border-white/10">

            {/* Full Name */}
            <Text className="text-[#88988a] text-[11px] font-semibold tracking-widest mb-2 ml-1">FULL NAME</Text>
            <View className="flex-row items-center bg-white/5 rounded-lg border border-white/10 mb-4 px-4">
              <FontAwesome5 name="user" size={14} color="#707f71" />
              <TextInput
                placeholder="Abdullah Ibn Mas'ud"
                placeholderTextColor="#707f71"
                className="flex-1 py-3.5 px-3 text-white text-[15px]"
                onChangeText={setFullName}
                value={fullName}
              />
            </View>

            {/* Email */}
            <Text className="text-[#88988a] text-[11px] font-semibold tracking-widest mb-2 ml-1">EMAIL ADDRESS</Text>
            <View className="flex-row items-center bg-white/5 rounded-lg border border-white/10 mb-4 px-4">
              <Ionicons name="mail-outline" size={18} color="#707f71" />
              <TextInput
                placeholder="heart@peace.com"
                placeholderTextColor="#707f71"
                className="flex-1 py-3.5 px-3 text-white text-[15px]"
                onChangeText={setEmail}
                value={email}
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <Text className="text-[#88988a] text-[11px] font-semibold tracking-widest mb-2 ml-1">PASSWORD</Text>
            <View className="flex-row items-center bg-white/5 rounded-lg border border-white/10 mb-4 px-4">
              <Ionicons name="lock-closed-outline" size={18} color="#707f71" />
              <TextInput
                placeholder="••••••••••••"
                placeholderTextColor="#707f71"
                secureTextEntry
                className="flex-1 py-3.5 px-3 text-white text-[15px]"
                onChangeText={setPassword}
                value={password}
              />
              <Ionicons name="eye-outline" size={20} color="#707f71" />
            </View>

            {/* Confirm Password */}
            <Text className="text-[#88988a] text-[11px] font-semibold tracking-widest mb-2 ml-1">CONFIRM PASSWORD</Text>
            <View className="flex-row items-center bg-white/5 rounded-lg border border-white/10 mb-5 px-4">
              <Ionicons name="shield-checkmark-outline" size={18} color="#707f71" />
              <TextInput
                placeholder="••••••••••••"
                placeholderTextColor="#707f71"
                secureTextEntry
                className="flex-1 py-3.5 px-3 text-white text-[15px]"
                onChangeText={setConfirmPassword}
                value={confirmPassword}
              />
            </View>

            {/* Terms */}
            <TouchableOpacity
              className="flex-row mb-6 pr-2"
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              <MaterialCommunityIcons
                name={agreedToTerms ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={20}
                color={agreedToTerms ? '#dbb142' : '#88988a'}
              />
              <Text className="text-[#88988a] text-[12px] ml-2 leading-4">
                I acknowledge that I have read and agree to the{' '}
                <Text className="text-[#dbb142]">Terms of Service</Text> and{' '}
                <Text className="text-[#dbb142]">Privacy Policy</Text>.
              </Text>
            </TouchableOpacity>

            {/* Create Account Button */}
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={loading}
              className={`py-4 rounded-lg items-center justify-center ${loading ? 'bg-[#dbb142]/70' : 'bg-[#dbb142]'}`}
            >
              {loading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text className="text-[#101a15] font-bold text-[17px]">Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Social Sign In */}
          <View className="flex-row items-center my-8">
            <View className="flex-1 h-[1px] bg-white/10" />
            <Text className="text-[#88988a] text-[12px] font-semibold mx-4">OR SIGN UP WITH</Text>
            <View className="flex-1 h-[1px] bg-white/10" />
          </View>

          <View className="flex-row justify-between mb-8">
            <TouchableOpacity className="flex-1 flex-row items-center justify-center py-3.5 rounded-lg border border-white/15 mr-2">
              <Ionicons name="logo-google" size={18} color="white" className="mr-2" />
              <Text className="text-white font-medium ml-2">Google</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center py-3.5 rounded-lg border border-white/15 ml-2">
              <Ionicons name="logo-apple" size={20} color="white" className="mr-2" />
              <Text className="text-white font-medium ml-2">Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="flex-row justify-center mb-10">
            <Text className="text-white/60">Already part of the sanctuary? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text className="text-[#dbb142] font-semibold">Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Secure Badge */}
          <View className="flex-row justify-center items-center opacity-40">
            <Ionicons name="shield-checkmark-outline" size={14} color="#88988a" />
            <Text className="text-[#88988a] text-[10px] ml-1.5 tracking-tighter">ENCRYPTED & SECURE ARCHITECTURE</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default SignUpScreen;