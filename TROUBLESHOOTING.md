# Troubleshooting Guide - Internal Server Error

## 🔍 Common Issues and Solutions

### Issue 1: Internal Server Error on Product Page

#### Symptoms:
- Page shows "Internal Server Error"
- Dashboard loads but Products page fails
- Export button doesn't appear

#### Solutions:

**Step 1: Check Database Connection**
```bash
# Verify MySQL is running
mysql -h localhost -u root -p aroggo -e "SELECT COUNT(*) FROM products;"

# Check .env file has correct credentials
cat .env | grep MYSQL_
```

**Step 2: Check API Endpoints**
```bash
# Start dev server
npm run dev

# In another terminal, test API
curl http://localhost:3000/api/search
# Should NOT show "Internal Server Error"
```

**Step 3: Check Browser Console**
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Share the full error message

---

### Issue 2: Export Button Doesn't Work

#### Symptoms:
- Export button shows but clicking does nothing
- No error message appears
- Button gets stuck in loading state

#### Solutions:

**Step 1: Check Browser Console**
```
F12 → Console tab → Look for red errors
```

**Step 2: Verify API Authentication**
- Make sure you're logged in (not on /login page)
- Check auth token in cookies

**Step 3: Check Network Tab**
```
F12 → Network tab → Click Export All
→ Look for failed requests
→ Check /api/search responses
```

---

### Issue 3: "No Products Found" When Exporting

#### Symptoms:
- Export button appears
- Click "Export All"
- Alert: "No products found to export"

#### Solutions:

**Step 1: Clear Filters**
```
1. Click "Clear ×" button
2. Try exporting with no filters
3. Should export all products
```

**Step 2: Verify Database Has Products**
```bash
mysql -h localhost -u root -p aroggo -e "SELECT COUNT(*) as product_count FROM products;"
# Should show > 0
```

**Step 3: Check Search API**
```bash
curl "http://localhost:3000/api/search" \
  -H "Cookie: auth_token=YOUR_TOKEN"
# Should return JSON with data array
```

---

### Issue 4: "Cannot Access catNameMap" Error

#### Symptoms:
- Page shows reference error
- Related to category mapping

#### Solutions:

**Step 1: Clear Cache**
```bash
rm -rf .next
npm run dev
```

**Step 2: Rebuild**
```bash
npm run build
npm start
```

---

### Issue 5: Export Button Shows Progress But Never Completes

#### Symptoms:
- Button shows "Loading... 123/5000"
- Progress stops at some percentage
- Browser doesn't freeze but export doesn't finish

#### Solutions:

**Step 1: Check Network Speed**
- This is normal for 5,000+ products
- Wait 15-20 seconds for completion
- Check Network tab to see if requests are completing

**Step 2: Check Database Performance**
```bash
mysql -h localhost -u root -p aroggo -e "SELECT COUNT(*) FROM products;"
# If this is slow, database needs optimization
```

**Step 3: Reduce Export Size**
- Apply filters to reduce products
- Export by category instead of all products

---

## 🔧 Debug Steps

### Step 1: Enable Detailed Logging

Edit `src/lib/export-advanced.ts`:

```typescript
// Add this after line 30
console.log('Total products to export:', total)

// Add this after line 52
console.log(`Fetched page ${page}/${totalPages}, total so far: ${allProducts.length}`)
```

### Step 2: Check Console Output

```bash
npm run dev

# Look for logs:
# "Total products to export: 5000"
# "Fetched page 1/50, total so far: 100"
# etc.
```

### Step 3: Monitor Network Requests

1. Open DevTools (F12)
2. Go to Network tab
3. Click "Export All"
4. Watch requests to `/api/search`
5. Check if all 50 pages load successfully

---

## 🚨 Error Messages and Meanings

### "Cannot access 'catNameMap' before initialization"
**Cause**: Code ordering issue
**Solution**: 
```bash
rm -rf .next
npm run build
```

### "Failed to fetch product count: 401"
**Cause**: Not authenticated
**Solution**: 
- Go to /login
- Enter admin credentials
- Try again

### "Failed to fetch product count: 500"
**Cause**: Server error (likely API endpoint issue)
**Solution**:
```bash
# Check API is working
curl http://localhost:3000/api/search
# Should return JSON, not error
```

### "No products found to export"
**Cause**: Search returned zero results
**Solution**:
- Click "Clear ×" to remove filters
- Try with no filters

---

## 🔐 Production Checklist

Before deploying, verify:

- [ ] Database is configured correctly
- [ ] API endpoints are responding
- [ ] Authentication works
- [ ] Export features work with test data
- [ ] Browser console shows no errors
- [ ] Network requests complete successfully
- [ ] Category names display correctly
- [ ] Progress indicator works

---

## 📊 Database Verification

```bash
# Check database exists
mysql -h localhost -u root -p -e "SHOW DATABASES;" | grep aroggo

# Check tables exist
mysql -h localhost -u root -p aroggo -e "SHOW TABLES;"

# Check products table
mysql -h localhost -u root -p aroggo -e "SELECT COUNT(*) as count FROM products;"

# Check categories
mysql -h localhost -u root -p aroggo -e "SELECT COUNT(*) as count FROM categories;"

# Check if data is being returned
mysql -h localhost -u root -p aroggo -e "SELECT p_id, p_name, p_cat_id FROM products LIMIT 5;"
```

---

## 🌐 API Endpoint Testing

```bash
# Start server
npm run dev

# Test authentication
curl http://localhost:3000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@arogga.com","password":"your-password"}'

# Get auth token from response, then test search
curl "http://localhost:3000/api/search?_page=1&_perPage=10" \
  -H "Cookie: auth_token=YOUR_TOKEN_HERE"
```

---

## 💻 Browser DevTools Debugging

### Check Console for Errors
```
F12 → Console tab → Look for red text
```

### Check Network Requests
```
F12 → Network tab → Click Export All → Watch requests
```

### Check Local Storage
```
F12 → Application → Local Storage → Check auth tokens
```

---

## 🆘 Getting Help

### Provide This Information:
1. **Error message** (full text)
2. **When it happens** (page load, export, etc.)
3. **Database status**:
   ```bash
   mysql -h localhost -u root -p aroggo -e "SELECT COUNT(*) FROM products;"
   ```
4. **Browser console errors** (screenshot)
5. **Network tab failures** (screenshot)

### Commands to Run:
```bash
# Check build
npm run build 2>&1 | tail -20

# Check dev server
npm run dev

# Check database
mysql -h localhost -u root -p aroggo -e "SHOW TABLES;"
```

---

## ✅ Quick Fix Checklist

- [ ] Is database running? `mysql -u root -p aroggo -e "SELECT 1;"`
- [ ] Is .env configured? `cat .env | grep MYSQL_`
- [ ] Are API endpoints working? `curl http://localhost:3000/api/search`
- [ ] Is user logged in? (Check if on /login page)
- [ ] Are there products? `SELECT COUNT(*) FROM products;`
- [ ] Did you rebuild? `npm run build`
- [ ] Did you clear cache? `rm -rf .next`

If all checks pass but error persists, check browser console (F12) for detailed error message.

