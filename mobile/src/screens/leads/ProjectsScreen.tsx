import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MeqHeader } from '../../components/common/MeqHeader';
import { GradientView } from '../../components/common/GradientView';
import { IconTile } from '../../components/common/IconTile';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { leadApi } from '../../api/leadApi';
import { Project } from '../../types';

const ICON_VARIANTS: Array<'blue' | 'purple' | 'orange' | 'green'> = [
  'blue',
  'purple',
  'orange',
  'green',
];

const PROJECT_ICONS = ['briefcase', 'business', 'cart', 'people'];

export const ProjectsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();

  const [activeSegment, setActiveSegment] = useState<'PROJECTS' | 'MY_LEADS'>('PROJECTS');
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await leadApi.getActiveProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects(true);
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenMyLeads = () => {
    navigation.navigate('LeadsList', {
      mode: 'MY_LEADS',
      projectName: 'My Leads',
    });
  };

  const handleSelectProject = (project: Project) => {
    navigation.navigate('LeadsList', {
      mode: 'PROJECT',
      projectId: project.id,
      projectName: project.name,
    });
  };

  const handlePressNew = () => {
    if (isAdmin) {
      navigation.navigate('AdminProjects');
    } else {
      navigation.navigate('LeadsList', {
        mode: 'PROJECT',
        projectName: 'All Leads',
      });
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* Top MEQ Header with "+ New" Gradient Pill Button */}
      <MeqHeader
        rightElement={
          <TouchableOpacity activeOpacity={0.8} onPress={handlePressNew}>
            <GradientView
              colors={colors.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.newButton}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.newButtonText}>New</Text>
            </GradientView>
          </TouchableOpacity>
        }
      />

      {/* Screen Title Block */}
      <View style={styles.titleSection}>
        <Text style={styles.screenHeading}>Leads & Projects</Text>
        <Text style={styles.screenSubheading}>
          Manage assigned leads & campaign pipelines
        </Text>
      </View>

      {/* Segmented Control Tabs */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={styles.segmentTab}
          activeOpacity={0.8}
          onPress={() => setActiveSegment('PROJECTS')}
        >
          {activeSegment === 'PROJECTS' ? (
            <GradientView
              colors={colors.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeSegmentPill}
            >
              <Text style={styles.activeSegmentText}>Projects</Text>
            </GradientView>
          ) : (
            <View style={styles.inactiveSegmentPill}>
              <Text style={styles.inactiveSegmentText}>Projects</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.segmentTab}
          activeOpacity={0.8}
          onPress={() => {
            setActiveSegment('MY_LEADS');
            handleOpenMyLeads();
          }}
        >
          {activeSegment === 'MY_LEADS' ? (
            <GradientView
              colors={colors.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeSegmentPill}
            >
              <Text style={styles.activeSegmentText}>My Leads</Text>
            </GradientView>
          ) : (
            <View style={styles.inactiveSegmentPill}>
              <Text style={styles.inactiveSegmentText}>My Leads</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Rounded Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !refreshing ? (
        <LoadingState message="Loading pipelines..." fullScreen />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchProjects()} fullScreen />
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 110 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item, index }) => {
            const variant = ICON_VARIANTS[index % ICON_VARIANTS.length];
            const iconName = PROJECT_ICONS[index % PROJECT_ICONS.length];
            const leadsCount = item.assignedLeadsCount ?? 0;
            // Simulated progress percentage between 35% and 85% based on id for demo fidelity
            const progressPercent = Math.min(85, Math.max(35, ((item.id * 17) % 55) + 30));

            return (
              <TouchableOpacity
                style={styles.projectCard}
                activeOpacity={0.75}
                onPress={() => handleSelectProject(item)}
              >
                <View style={styles.cardHeader}>
                  <IconTile
                    name={iconName}
                    size={42}
                    iconSize={20}
                    variant={variant}
                  />

                  <View style={styles.projectInfo}>
                    <Text style={styles.projectName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.projectSubtitle}>
                      {leadsCount} {leadsCount === 1 ? 'lead' : 'leads'} • {progressPercent}% completed
                    </Text>
                  </View>

                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>
                      {item.status || 'ACTIVE'}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" style={{ marginLeft: 4 }} />
                </View>

                {/* Progress Bar Strip */}
                <View style={styles.progressRow}>
                  <View style={styles.progressBarTrack}>
                    <GradientView
                      colors={colors.progressGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                    />
                  </View>
                  <Text style={styles.progressText}>{progressPercent}%</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="briefcase-outline"
              title="No Projects Found"
              message="No campaigns match your search query."
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  titleSection: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 8,
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
  },
  screenSubheading: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    marginHorizontal: spacing.md,
    marginTop: 10,
    marginBottom: 12,
    padding: 3,
    borderRadius: 14,
  },
  segmentTab: {
    flex: 1,
  },
  activeSegmentPill: {
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegmentText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  inactiveSegmentPill: {
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveSegmentText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 2,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectInfo: {
    flex: 1,
    marginLeft: 12,
  },
  projectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  projectSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    width: 30,
    textAlign: 'right',
  },
});
