package com.goto.base.pattern

/**
 * Profile 管理器
 *
 * 简单的 profile 管理器，支持创建/删除/列出 profile。
 * 实际数据隔离由 InMemoryPatternStore（或其他 PatternStore 实现）中的 profileId 参数完成。
 *
 * 该管理器仅维护 profile 元数据列表，不直接持有 Pattern 数据。
 * 当 store 不存在某 profile 时，首次访问会自动创建（懒加载）。
 */
class ProfileManager(
    private val store: PatternStore
) {
    /** 默认 profile ID */
    val defaultProfileId: String = "default"

    /** 已知的 profile ID 集合（包含 default） */
    private val knownProfileIds: MutableSet<String> = mutableSetOf(defaultProfileId)

    /**
     * 列出所有已知的 profile ID。
     * 注意：store 内部可能存在未通过本管理器注册的 profile（直接调用 store API 创建），
     * 这里只返回通过本管理器注册的 profile。
     */
    fun listProfiles(): List<String> = knownProfileIds.toList().sorted()

    /**
     * 创建一个新的 profile（注册到已知列表）。
     *
     * @param profileId 新 profile 的 ID
     * @return 是否创建成功（false 表示已存在）
     */
    fun createProfile(profileId: String): Boolean {
        require(profileId.isNotEmpty()) { "profileId must not be empty" }
        if (knownProfileIds.contains(profileId)) return false
        knownProfileIds.add(profileId)
        // 通过 resetPatternProfile 确保该 profile 存在且为空
        store.resetPatternProfile(profileId)
        return true
    }

    /**
     * 删除一个 profile（清空其全部 Pattern 数据并从已知列表移除）。
     *
     * @param profileId 要删除的 profile ID
     * @return 是否删除成功（false 表示不存在或为 default profile）
     */
    fun deleteProfile(profileId: String): Boolean {
        require(profileId.isNotEmpty()) { "profileId must not be empty" }
        if (profileId == defaultProfileId) return false  // default profile 不可删除
        if (!knownProfileIds.contains(profileId)) return false
        store.resetPatternProfile(profileId)
        knownProfileIds.remove(profileId)
        return true
    }

    /**
     * 检查 profile 是否存在（仅检查已知列表）。
     */
    fun hasProfile(profileId: String): Boolean {
        return knownProfileIds.contains(profileId)
    }

    /**
     * 重置一个 profile（清空其全部 Pattern 数据，但保留 profile 本身）。
     */
    fun resetProfile(profileId: String): Boolean {
        if (!knownProfileIds.contains(profileId)) return false
        store.resetPatternProfile(profileId)
        return true
    }

    /**
     * 导出指定 profile 的全部数据。
     */
    fun exportProfile(profileId: String = defaultProfileId): PatternProfileData {
        return store.exportPatternProfile(profileId)
    }

    /**
     * 导入数据到指定 profile（覆盖）。
     */
    fun importProfile(data: PatternProfileData, profileId: String = defaultProfileId) {
        store.importPatternProfile(data, profileId)
        knownProfileIds.add(profileId)
    }

    /**
     * 获取指定 profile 的统计信息。
     */
    fun stats(profileId: String = defaultProfileId): PatternStoreStats {
        return store.stats(profileId)
    }
}
