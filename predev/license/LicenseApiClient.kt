package com.appindex.license

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

/**
 * 授权鉴权 API 客户端 — 匹配服务端实现
 *
 * 服务端地址：https://goto-d8gwjhp6se2c467e6-1329726952.ap-shanghai.ap.tcloudbaseapp.com/auth
 *
 * Header:
 *   Content-Type: application/json
 *   auth: s9Kd7pR2xQbF5nG8zT3cJ6vY1mB4uN7
 *
 * Body (JSON):
 *   校验：{"type":"check","key":"激活码","did":"机器码"}
 *   激活：{"type":"active","key":"激活码","did":"机器码"}
 *   换绑：{"type":"active","key":"激活码","did":"机器码","change":true}
 *
 * 响应格式：{"code":0,"msg":"..."}
 *   code=0:   校验通过 / 需换绑
 *   code=1:   激活成功
 *   code=-1:  激活码无效 / 已被其他设备绑定
 *   code=-98: 参数错误
 *   code=-99: 非法请求（鉴权失败）
 */
class LicenseApiClient(context: Context) {

    private val API_BASE_URL = "https://goto-d8gwjhp6se2c467e6-1329726952.ap-shanghai.ap.tcloudbaseapp.com"
    private val AUTH_HEADER = "s9Kd7pR2xQbF5nG8zT3cJ6vY1mB4uN7"

    init {
        // 云开发环境 SSL 证书域名不匹配，配置信任所有证书
        try {
            val trustAllCerts = arrayOf<TrustManager>(
                object : X509TrustManager {
                    override fun checkClientTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
                    override fun checkServerTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
                    override fun getAcceptedIssuers(): Array<java.security.cert.X509Certificate> = arrayOf()
                }
            )
            val sslContext = SSLContext.getInstance("SSL")
            sslContext.init(null, trustAllCerts, java.security.SecureRandom())
            HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.socketFactory)
            HttpsURLConnection.setDefaultHostnameVerifier(HostnameVerifier { _, _ -> true })
        } catch (_: Exception) {}
    }

    /**
     * 环节1：设备校验（48h周期）
     *
     * POST /auth
     * Body: {"type":"check","key":"激活码","did":"机器码"}
     *
     * @return ApiResult
     *   code = 0:  有效
     *   code = -1: 已被其他设备绑定 / 激活码无效
     *   code = -99: 非法请求
     */
    suspend fun verifyDevice(licenseCode: String, deviceId: String): ApiResult {
        return withContext(Dispatchers.IO) {
            try {
                val body = JSONObject().apply {
                    put("type", "check")
                    put("key", licenseCode)
                    put("did", deviceId)
                }
                val response = postRequest("$API_BASE_URL/auth", body.toString())
                parseResponse(response)
            } catch (e: Exception) {
                ApiResult(code = -2, msg = "网络错误: ${e.message}")
            }
        }
    }

    /**
     * 环节2：激活授权码
     *
     * POST /auth
     * Body: {"type":"active","key":"激活码","did":"机器码"}
     *
     * @return ApiResult
     *   code = 1:  激活成功
     *   code = 0:  已被其他设备绑定（询问换绑）
     *   code = -1: 激活码无效
     *   code = -99: 非法请求
     */
    suspend fun activateLicense(licenseCode: String, deviceId: String): ApiResult {
        return withContext(Dispatchers.IO) {
            try {
                val body = JSONObject().apply {
                    put("type", "active")
                    put("key", licenseCode)
                    put("did", deviceId)
                }
                val response = postRequest("$API_BASE_URL/auth", body.toString())
                parseResponse(response)
            } catch (e: Exception) {
                ApiResult(code = -2, msg = "网络错误: ${e.message}")
            }
        }
    }

    /**
     * 换绑：用户确认后调用
     *
     * POST /auth
     * Body: {"type":"active","key":"激活码","did":"机器码","change":true}
     *
     * @return ApiResult
     *   code = 1: 换绑成功
     */
    suspend fun transferLicense(licenseCode: String, deviceId: String): ApiResult {
        return withContext(Dispatchers.IO) {
            try {
                val body = JSONObject().apply {
                    put("type", "active")
                    put("key", licenseCode)
                    put("did", deviceId)
                    put("change", true)
                }
                val response = postRequest("$API_BASE_URL/auth", body.toString())
                parseResponse(response)
            } catch (e: Exception) {
                ApiResult(code = -2, msg = "网络错误: ${e.message}")
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  用户数据接口 /update
    // ═══════════════════════════════════════════════════════════

    /**
     * 初始化用户数据（激活成功后调用）
     *
     * POST /update
     * Body: {"type":"init","key":"激活码"}
     */
    suspend fun initUserData(licenseCode: String): ApiResult {
        return withContext(Dispatchers.IO) {
            try {
                val body = JSONObject().apply {
                    put("type", "init")
                    put("key", licenseCode)
                }
                val response = postRequest("$API_BASE_URL/update", body.toString())
                parseResponse(response)
            } catch (e: Exception) {
                ApiResult(code = -2, msg = "网络错误: ${e.message}")
            }
        }
    }

    /**
     * 上报更新用户数据（校验成功时调用）
     *
     * POST /update
     * Body: {"type":"update","key":"激活码","addDay":1,"addChar":5,"addTime":120,"App_Launches":[...]}
     */
    suspend fun updateUserData(
        licenseCode: String,
        addDay: Int = 0,
        addChar: Int = 0,
        addTime: Int = 0,
        appLaunches: org.json.JSONArray? = null
    ): ApiResult {
        return withContext(Dispatchers.IO) {
            try {
                val body = JSONObject().apply {
                    put("type", "update")
                    put("key", licenseCode)
                    put("addDay", addDay)
                    put("addChar", addChar)
                    put("addTime", addTime)
                    appLaunches?.let { put("App_Launches", it) }
                }
                val response = postRequest("$API_BASE_URL/update", body.toString())
                parseResponse(response)
            } catch (e: Exception) {
                ApiResult(code = -2, msg = "网络错误: ${e.message}")
            }
        }
    }

    /**
     * 清空云端用户数据（清空数据时调用）
     *
     * POST /update
     * Body: {"type":"clear","key":"激活码"}
     */
    suspend fun clearUserData(licenseCode: String): ApiResult {
        return withContext(Dispatchers.IO) {
            try {
                val body = JSONObject().apply {
                    put("type", "clear")
                    put("key", licenseCode)
                }
                val response = postRequest("$API_BASE_URL/update", body.toString())
                parseResponse(response)
            } catch (e: Exception) {
                ApiResult(code = -2, msg = "网络错误: ${e.message}")
            }
        }
    }

    // ─── 网络请求 ───

    private fun postRequest(urlString: String, body: String): String {
        val url = URL(urlString)
        val connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.connectTimeout = 10000
        connection.readTimeout = 10000
        connection.doOutput = true
        connection.useCaches = false
        connection.setRequestProperty("Content-Type", "application/json")
        connection.setRequestProperty("auth", AUTH_HEADER)
        connection.setRequestProperty("User-Agent", "AppIndex/1.0")
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("Accept-Language", "zh-CN")

        connection.outputStream.write(body.toByteArray(Charsets.UTF_8))
        connection.outputStream.flush()
        connection.outputStream.close()

        val responseCode = connection.responseCode
        return if (responseCode == 200) {
            connection.inputStream.bufferedReader().use { it.readText() }
        } else {
            val errorBody = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
            throw Exception("HTTP $responseCode: $errorBody")
        }
    }

    // ─── 解析响应 ───

    private fun parseResponse(body: String): ApiResult {
        return try {
            val json = JSONObject(body)
            ApiResult(
                code = json.optInt("code", -2),
                msg = json.optString("msg", ""),
                userNo = json.optString("userNo", "").ifEmpty {
                    json.optString("member_id", "")
                }.ifEmpty { null }
            )
        } catch (e: Exception) {
            ApiResult(code = -2, msg = "解析错误: ${e.message}")
        }
    }
}

/**
 * 通用 API 响应
 */
data class ApiResult(
    val code: Int,
    val msg: String,
    val userNo: String? = null  // 服务端返回的格式化编号，如 U00001
)
