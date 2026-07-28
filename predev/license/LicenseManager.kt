package com.appindex.license

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

/**
 * 授权鉴权管理器 v5 — 匹配服务端实现
 *
 * ═══════════════════════════════════════════════════════════
 *  服务端返回码：
 *    code=0:   校验通过 / 需换绑
 *    code=1:   激活成功
 *    code=-1:  激活码无效 / 已被其他设备绑定
 *    code=-98: 参数错误
 *    code=-99: 非法请求（鉴权失败）
 *
 *  核心规则：
 *  - 环节1（校验）：每48h校验一次，本地传机器码，云端比对
 *  - 环节2（激活）：本地传激活码+机器码，云端校验
 *  - 换绑：type="active" + change=true
 *  - 断网补偿：失败后每次打开软件触发（30min/60min各一次），永不锁定
 * ═══════════════════════════════════════════════════════════
 */
class LicenseManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("appindex_license", Context.MODE_PRIVATE)

    private val apiClient = LicenseApiClient(context)
    private val deviceId: String = getDeviceId(context)

    /** 当前是否已激活 */
    val isActivated: Boolean
        get() = prefs.getString(KEY_LICENSE_CODE, null) != null

    /**
     * 检测是否为破解用户：
     * 本地有激活记录，但当前机器码与缓存的设备ID不匹配
     */
    val isPirated: Boolean
        get() {
            val code = prefs.getString(KEY_LICENSE_CODE, null) ?: return false
            val cachedDeviceId = prefs.getString(KEY_CACHED_DEVICE_ID, null)
            return cachedDeviceId != null && cachedDeviceId != deviceId
        }

    /** 当前激活的授权码 */
    val currentLicenseCode: String?
        get() = prefs.getString(KEY_LICENSE_CODE, null)

    /** 当前会员编号 */
    val memberId: String
        get() = prefs.getString(KEY_MEMBER_ID, "U00000") ?: "U00000"

    /** 订单号 */
    val orderId: String
        get() = prefs.getString(KEY_ORDER_ID, "") ?: ""

    /** 注册时间戳（毫秒） */
    val registerTimestamp: Long
        get() = prefs.getLong(KEY_REGISTER_DATE, 0L)

    // ─── 环节1：48h校验 ───

    /**
     * 环节1：设备校验
     *
     * @return VerifyStatus 校验状态
     */
    suspend fun verifyDevice(): VerifyStatus {
        val code = prefs.getString(KEY_LICENSE_CODE, null)
            ?: return VerifyStatus.NO_LICENSE

        val result = apiClient.verifyDevice(code, deviceId)

        return when (result.code) {
            0 -> {
                // 有效，重置48h计时，保存 userNo
                saveVerifySuccess(result.userNo)
                VerifyStatus.OK
            }
            -1 -> {
                // 已被其他设备绑定，清除本地，引导重新激活
                clearLocalCache()
                VerifyStatus.DEVICE_CONFLICT
            }
            else -> {
                // 网络错误（-2/-98/-99），进入断网补偿
                handleNetworkFailure()
                VerifyStatus.OFFLINE
            }
        }
    }

    /**
     * 应用启动时调用：检查是否需要校验
     */
    suspend fun checkOnAppLaunch(): VerifyStatus {
        val code = prefs.getString(KEY_LICENSE_CODE, null)
            ?: return VerifyStatus.NO_LICENSE

        val lastVerifyTime = prefs.getLong(KEY_LAST_VERIFY_TIME, 0)
        val now = System.currentTimeMillis()

        // 48h内已校验 → 静默通过
        if (now - lastVerifyTime < VERIFY_INTERVAL_MS) {
            return VerifyStatus.OK
        }

        // 检查断网补偿状态
        val retryCount = prefs.getInt(KEY_RETRY_COUNT, 0)
        val lastRetryTime = prefs.getLong(KEY_LAST_RETRY_TIME, 0)

        if (retryCount > 0) {
            val nextRetryInterval = when (retryCount) {
                1 -> 30 * 60 * 1000L
                2 -> 60 * 60 * 1000L
                else -> VERIFY_INTERVAL_MS
            }

            if (now - lastRetryTime < nextRetryInterval) {
                return VerifyStatus.OK
            }

            val status = verifyDevice()

            if (status == VerifyStatus.OFFLINE) {
                if (retryCount >= 2) {
                    resetRetryState()
                } else {
                    prefs.edit()
                        .putInt(KEY_RETRY_COUNT, retryCount + 1)
                        .putLong(KEY_LAST_RETRY_TIME, now)
                        .apply()
                }
            }
            return status
        }

        return verifyDevice()
    }

    // ─── 环节2：激活 ───

    /**
     * 环节2：激活授权码
     *
     * @param code 用户输入的激活码
     * @return ActivateResult 激活结果
     */
    suspend fun activate(code: String): ActivateResult {
        val normalizedCode = code.trim().uppercase()

        if (!validateFormat(normalizedCode)) {
            return ActivateResult(-1, "授权码格式无效")
        }

        val result = apiClient.activateLicense(normalizedCode, deviceId)

        return when (result.code) {
            1 -> {
                // 激活成功，保存 userNo
                saveActivation(normalizedCode, result.userNo)
                ActivateResult(1, "激活成功！")
            }
            0 -> {
                // 已被其他设备绑定，询问换绑（也保存 userNo 用于显示）
                result.userNo?.let { prefs.edit().putString(KEY_MEMBER_ID, it).apply() }
                ActivateResult(0, "该激活码已被其他设备绑定，是否换绑？")
            }
            -1 -> {
                // 激活码无效
                ActivateResult(-1, result.msg.ifEmpty { "激活码无效，请重新输入" })
            }
            else -> {
                // 网络错误
                ActivateResult(-2, "网络连接失败，请检查网络")
            }
        }
    }

    /**
     * 换绑：用户确认后调用
     */
    suspend fun transferActivate(code: String): ActivateResult {
        val normalizedCode = code.trim().uppercase()
        val result = apiClient.transferLicense(normalizedCode, deviceId)

        return if (result.code == 1) {
            saveActivation(normalizedCode, result.userNo)
            ActivateResult(1, "换绑成功！当前设备已激活")
        } else {
            ActivateResult(-2, "换绑失败，请检查网络后重试")
        }
    }

    // ─── 注销 ───

    /** 注销（清除本地缓存） */
    fun deactivate() {
        clearLocalCache()
    }

    /** 重置注册日期为当天 */
    fun resetRegistrationDate() {
        prefs.edit().putLong(KEY_REGISTER_DATE, System.currentTimeMillis()).apply()
    }

    // ─── 内部方法 ───

    private fun saveVerifySuccess(userNo: String?) {
        prefs.edit().apply {
            putLong(KEY_LAST_VERIFY_TIME, System.currentTimeMillis())
            putInt(KEY_RETRY_COUNT, 0)
            putLong(KEY_LAST_RETRY_TIME, 0)
            putString(KEY_CACHED_DEVICE_ID, deviceId)
            userNo?.let { putString(KEY_MEMBER_ID, it) }
        }.apply()
    }

    private fun saveActivation(code: String, userNo: String?) {
        prefs.edit().apply {
            putString(KEY_LICENSE_CODE, code)
            putLong(KEY_LAST_VERIFY_TIME, System.currentTimeMillis())
            putInt(KEY_RETRY_COUNT, 0)
            putLong(KEY_LAST_RETRY_TIME, 0)
            putString(KEY_CACHED_DEVICE_ID, deviceId)
            userNo?.let { putString(KEY_MEMBER_ID, it) }
            if (prefs.getLong(KEY_REGISTER_DATE, 0L) == 0L) {
                putLong(KEY_REGISTER_DATE, System.currentTimeMillis())
            }
        }.apply()
    }

    private fun handleNetworkFailure() {
        val now = System.currentTimeMillis()
        val retryCount = prefs.getInt(KEY_RETRY_COUNT, 0)
        if (retryCount == 0) {
            prefs.edit()
                .putInt(KEY_RETRY_COUNT, 1)
                .putLong(KEY_LAST_RETRY_TIME, now)
                .apply()
        }
    }

    private fun resetRetryState() {
        prefs.edit()
            .putInt(KEY_RETRY_COUNT, 0)
            .putLong(KEY_LAST_RETRY_TIME, 0)
            .putLong(KEY_LAST_VERIFY_TIME, System.currentTimeMillis())
            .apply()
    }

    private fun clearLocalCache() {
        prefs.edit().clear().apply()
    }

    private fun validateFormat(code: String): Boolean {
        return code.matches(Regex("^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$"))
    }

    private fun getDeviceId(context: Context): String {
        val prefs = context.getSharedPreferences("appindex_device", Context.MODE_PRIVATE)
        var id = prefs.getString("device_id", null)
        if (id == null) {
            id = UUID.randomUUID().toString().take(8)
            prefs.edit().putString("device_id", id).apply()
        }
        return id
    }

    companion object {
        private const val KEY_LICENSE_CODE = "license_code"
        private const val KEY_MEMBER_ID = "member_id"
        private const val KEY_ORDER_ID = "order_id"
        private const val KEY_REGISTER_DATE = "register_date"
        private const val KEY_CACHED_DEVICE_ID = "cached_device_id"
        private const val KEY_LAST_VERIFY_TIME = "last_verify_time"
        private const val KEY_RETRY_COUNT = "retry_count"
        private const val KEY_LAST_RETRY_TIME = "last_retry_time"
        private const val VERIFY_INTERVAL_MS = 48L * 60 * 60 * 1000
    }

    enum class VerifyStatus {
        OK,
        OFFLINE,
        NO_LICENSE,
        DEVICE_CONFLICT
    }

    data class ActivateResult(
        val code: Int,
        val message: String
    )
}
