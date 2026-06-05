#!/bin/bash
# Local security auditing and penetration testing helper script

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0;6m'
YELLOW='\033[1;33m'

echo -e "${YELLOW}======================================================================${NC}"
echo -e "${YELLOW}         Node.js Security Hardening & Penetration Audit               ${NC}"
echo -e "${YELLOW}======================================================================${NC}"

# 1. Dependency Auditing
echo -e "\n${GREEN}[Step 1] Running npm audit for dependency vulnerability check...${NC}"
npm audit --audit-level=moderate
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✔ No moderate or high dependency vulnerabilities found.${NC}"
else
  echo -e "${RED}✘ Dependency vulnerabilities found. Run 'npm audit fix' to resolve.${NC}"
fi

# 2. Local Header Validation
echo -e "\n${GREEN}[Step 2] How to manually verify secure headers via curl:${NC}"
echo -e "Start your server locally with 'npm run dev' and query it:"
echo -e "  ${YELLOW}curl -I -s http://localhost:5000/health${NC}"
echo -e "Verify the presence of security headers:"
echo -e "  - ${YELLOW}Strict-Transport-Security${NC} (HTTPS enforcement)"
echo -e "  - ${YELLOW}Content-Security-Policy${NC} (XSS protection)"
echo -e "  - ${YELLOW}X-Content-Type-Options: nosniff${NC}"
echo -e "  - ${YELLOW}X-Frame-Options: SAMEORIGIN${NC}"

# 3. Penetration Testing Basics Checklist
echo -e "\n${GREEN}[Step 3] Penetration Testing Basics Checklist:${NC}"
echo -e "To perform basic penetration scans against the application, you can use these tools:"
echo -e "1. ${YELLOW}OWASP ZAP (Zed Attack Proxy)${NC}:"
echo -e "   - Run a baseline active scan against the API endpoints to detect common vulnerabilities."
echo -e "2. ${YELLOW}Nmap (Port and service scanning)${NC}:"
echo -e "   - Check open ports on your deployment target:"
echo -e "     ${YELLOW}nmap -sV -p 80,443,5000 <target-ip>${NC}"
echo -e "3. ${YELLOW}Nikto (Web server vulnerability scanner)${NC}:"
echo -e "   - Scan target web servers for insecure files and configurations:"
echo -e "     ${YELLOW}nikto -h http://localhost:5000${NC}"

echo -e "\n${YELLOW}======================================================================${NC}"
