package com.appindex.QuickActionsAndFloatingWindow

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.appindex.databinding.ItemOverlayAppBinding
import com.appindex.model.SearchResult
import com.appindex.Utility.MatchTypeLabel

/**
 * 叠加模式搜索结果适配器（毛玻璃卡片样式）
 */
class OverlayResultAdapter(
    private val onAppClick: (String, View) -> Unit
) : ListAdapter<SearchResult, OverlayResultAdapter.ViewHolder>(DIFF_CALLBACK) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemOverlayAppBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ViewHolder(
        private val binding: ItemOverlayAppBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(result: SearchResult) {
            binding.apply {
                appIcon.setImageDrawable(result.appInfo.icon)
                appName.text = result.appInfo.label
                appPackage.text = result.appInfo.packageName
                matchType.text = MatchTypeLabel.getLabel(result.matchType.name)
                root.setOnClickListener { onAppClick(result.appInfo.packageName, root) }
            }
        }
    }

    companion object {
        private val DIFF_CALLBACK = object : DiffUtil.ItemCallback<SearchResult>() {
            override fun areItemsTheSame(a: SearchResult, b: SearchResult): Boolean {
                return a.appInfo.packageName == b.appInfo.packageName
            }
            override fun areContentsTheSame(a: SearchResult, b: SearchResult): Boolean {
                return a == b
            }
        }
    }
}
